/**
 * LATCH — shared-authority deal board.
 * Submission for the OpenAI WebMCP Challenge (2026): https://webmcp.devpost.com/
 * Author: Yury Myshinskiy
 * Email: hackaton@telex.global
 * Registers document.modelContext tools so a ChatGPT agent shares this board.
 * License: MIT
 */
import {
  applyChange,
  boardSnapshot,
  commitDeal,
  getCard,
  proposeChange,
  releaseCard,
  type Board,
  type CardId,
} from "./board";

export type HoldApi = {
  getBoard: () => Board;
  setBoard: (next: Board) => void;
};

export type AgentHand = {
  name: string;
  kind: "read" | "write";
  on: string;
};

function modelContext(): ModelContext | undefined {
  return document.modelContext;
}

export function webmcpAvailable(): boolean {
  return typeof document.modelContext?.registerTool === "function";
}

function asCardId(value: unknown, board: Board): CardId | null {
  const id = typeof value === "string" ? value : "";
  return getCard(board, id) ? id : null;
}

function cardEnum(board: Board): string[] {
  const ids = board.cards.map((card) => card.id);
  return ids.length > 0 ? ids : ["rate"];
}

function denied(message: string) {
  return { ok: false, error: message };
}

async function askHuman(
  client: { requestUserInteraction?: <T>(run: () => Promise<T> | T) => Promise<T> } | undefined,
  run: () => boolean | Promise<boolean>,
): Promise<boolean> {
  if (client?.requestUserInteraction) {
    return Boolean(await client.requestUserInteraction(run));
  }
  return Boolean(await run());
}

export function listAgentHands(board: Board): AgentHand[] {
  const hands: AgentHand[] = [
    { name: "get_board_state", kind: "read", on: "board" },
    { name: "inspect_card", kind: "read", on: "any card" },
  ];

  if (!board.started || board.committed) return hands;

  for (const card of board.cards) {
    if (card.held || card.veto?.cut) continue;
    hands.push({
      name: "propose_card_change",
      kind: "write",
      on: card.title,
    });
    hands.push({
      name: "apply_card_change",
      kind: "write",
      on: card.title,
    });
  }

  if (board.cards.some((card) => card.held)) {
    hands.push({
      name: "request_release",
      kind: "write",
      on: "a held card",
    });
  }

  hands.push({ name: "commit_deal", kind: "write", on: "whole board" });
  return hands;
}

export async function syncWebmcp(api: HoldApi, signal: AbortSignal) {
  const ctx = modelContext();
  if (!ctx || typeof ctx.registerTool !== "function") return;

  const read = async (
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    execute: ModelContextTool["execute"],
  ) => {
    await ctx.registerTool(
      {
        name,
        description,
        inputSchema,
        annotations: { readOnlyHint: true },
        execute,
      },
      { signal },
    );
  };

  const write = async (
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    execute: ModelContextTool["execute"],
    extra?: { untrusted?: boolean },
  ) => {
    await ctx.registerTool(
      {
        name,
        description,
        inputSchema,
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: extra?.untrusted,
        },
        execute,
      },
      { signal },
    );
  };

  await read(
    "get_board_state",
    "Read the live LATCH board: scenario (A hourly / B retainer / C rush), phase, per-term notes, special opinions, held cards, objections, cut terms, writable cards, and current text. Notes, opinions, and vetoes are binding. Brief may be empty. If veto.cut is true, drop that term from the deal. Do not rewrite a cut term.",
    { type: "object", properties: {}, additionalProperties: false },
    async () => boardSnapshot(api.getBoard()),
  );

  await read(
    "inspect_card",
    "Read one deal card by id, including hold state, veto (object / cut + optional comment), the human note or special opinion, and any pending rewrite. Follow the note and the veto. Treat kind=opinion as a term the human added.",
    {
      type: "object",
      properties: {
        card_id: { type: "string", enum: cardEnum(api.getBoard()) },
      },
      required: ["card_id"],
      additionalProperties: false,
    },
    async (input) => {
      const current = api.getBoard();
      const id = asCardId(input.card_id, current);
      if (!id) return denied("unknown card_id");
      return getCard(current, id) ?? denied("card not found");
    },
  );

  const board = api.getBoard();
  if (!board.started || board.committed) return;

  const unlocked = board.cards
    .filter((card) => !card.held && !card.veto?.cut)
    .map((card) => card.id);
  const unlockedLabel = unlocked.join(", ") || "none";

  if (unlocked.length > 0) {
    await write(
      "propose_card_change",
      `Propose new text for an unlocked card. Follow that card's note and any veto. Does not apply it. Unlocked: ${unlockedLabel}.`,
      {
        type: "object",
        properties: {
          card_id: {
            type: "string",
            enum: unlocked,
            description: "Held cards are not listed and will be rejected.",
          },
          text: {
            type: "string",
            description: "Replacement card text. One or two sentences.",
          },
        },
        required: ["card_id", "text"],
        additionalProperties: false,
      },
      async (input) => {
        const current = api.getBoard();
        const id = asCardId(input.card_id, current);
        const text = typeof input.text === "string" ? input.text.trim() : "";
        if (!id) return denied("unknown card_id");
        if (!text) return denied("text is required");
        const target = getCard(current, id);
        if (!target) return denied("card not found");
        if (target.held) {
          return denied(`${id} is on HOLD. Ask the human to release it.`);
        }
        if (target.veto?.cut) {
          return denied(`${id} is cut from the deal. Do not rewrite it.`);
        }
        api.setBoard(proposeChange(current, id, text, "agent"));
        return { ok: true, card_id: id, pending: text };
      },
      { untrusted: true },
    );

    await write(
      "apply_card_change",
      `Apply new text to an unlocked card. Follow that card's note and any veto. Indemnity asks the human to confirm. Unlocked: ${unlockedLabel}.`,
      {
        type: "object",
        properties: {
          card_id: { type: "string", enum: unlocked },
          text: { type: "string" },
        },
        required: ["card_id", "text"],
        additionalProperties: false,
      },
      async (input, client) => {
        const current = api.getBoard();
        const id = asCardId(input.card_id, current);
        const text = typeof input.text === "string" ? input.text.trim() : "";
        if (!id) return denied("unknown card_id");
        if (!text) return denied("text is required");
        const target = getCard(current, id);
        if (!target) return denied("card not found");
        if (target.held) {
          return denied(`${id} is on HOLD. Ask the human to release it.`);
        }
        if (target.veto?.cut) {
          return denied(`${id} is cut from the deal. Do not rewrite it.`);
        }

        if (target.risk === "high") {
          const allowed = await askHuman(client, () =>
            window.confirm(`Apply this change to ${target.title}?\n\n${text}`),
          );
          if (!allowed) return denied("human rejected the apply");
        }

        api.setBoard(applyChange(api.getBoard(), id, text, "agent"));
        return { ok: true, card_id: id, text };
      },
      { untrusted: true },
    );
  }

  if (board.cards.some((card) => card.held)) {
    const held = board.cards.filter((card) => card.held).map((card) => card.id);
    await write(
      "request_release",
      "Ask the human to release a card that is on HOLD. Does not release it by itself.",
      {
        type: "object",
        properties: {
          card_id: { type: "string", enum: held },
          reason: { type: "string" },
        },
        required: ["card_id"],
        additionalProperties: false,
      },
      async (input, client) => {
        const current = api.getBoard();
        const id = asCardId(input.card_id, current);
        if (!id) return denied("unknown card_id");
        const target = getCard(current, id);
        if (!target) return denied("card not found");
        if (!target.held) return denied(`${id} is not on HOLD`);

        const reason =
          typeof input.reason === "string" && input.reason.trim()
            ? input.reason.trim()
            : "No reason given.";

        if (!client?.requestUserInteraction) {
          return { ok: false, error: "waiting for human release", card_id: id, reason };
        }

        const allowed = await client.requestUserInteraction(async () =>
          window.confirm(`Release HOLD on ${target.title}?\n\n${reason}`),
        );
        if (!allowed) return denied("human kept the HOLD");
        api.setBoard(releaseCard(api.getBoard(), id, "you"));
        return { ok: true, released: id };
      },
    );
  }

  await write(
    "commit_deal",
    "Freeze the whole board. Always asks the human to confirm. Irreversible in this session.",
    { type: "object", properties: {}, additionalProperties: false },
    async (_input, client) => {
      const allowed = await askHuman(client, () =>
        window.confirm("Commit this deal and freeze the board?"),
      );
      if (!allowed) return denied("human rejected commit");
      api.setBoard(commitDeal(api.getBoard(), "agent"));
      return { ok: true, committed: true };
    },
  );
}
