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
  loadScenario,
  proposeChange,
  releaseCard,
  type Board,
  type CardId,
  type ScenarioId,
} from "./board";

export type HoldApi = {
  getBoard: () => Board;
  setBoard: (next: Board) => void;
  confirm: (message: string) => Promise<boolean>;
};

export type AgentHand = {
  name: string;
  kind: "read" | "write";
  on: string;
};

const CARD_ID = {
  type: "string",
  description:
    "Card id from get_board_state. Stock ids: rate, scope, ip, indemnity, term, payment. Opinion cards use their own id.",
} as const;

function getModelContext(): ModelContext | undefined {
  const ctx = document.modelContext ?? navigator.modelContext;
  return ctx && typeof ctx.registerTool === "function" ? ctx : undefined;
}

export function webmcpAvailable(): boolean {
  return Boolean(getModelContext());
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function waitForModelContext(
  signal: AbortSignal,
): Promise<ModelContext | undefined> {
  const first = getModelContext();
  if (first) return first;

  while (!signal.aborted) {
    await sleep(200, signal);
    const ctx = getModelContext();
    if (ctx) return ctx;
  }
  return undefined;
}

function asScenarioId(value: unknown): ScenarioId | null {
  return value === "A" || value === "B" || value === "C" ? value : null;
}

function asCardId(value: unknown, board: Board): CardId | null {
  const id = typeof value === "string" ? value : "";
  return getCard(board, id) ? id : null;
}

function toolText(payload: unknown) {
  const text =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

function toolOk(payload: unknown) {
  return toolText(payload);
}

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function askHuman(
  extra: ModelContextExecuteExtra | undefined,
  confirm: (message: string) => Promise<boolean>,
  message: string,
): Promise<boolean> {
  if (extra?.signal?.aborted) return false;
  const onPage = () => confirm(message);
  if (typeof extra?.requestUserInteraction === "function") {
    try {
      return Boolean(await extra.requestUserInteraction(onPage));
    } catch {
      // Host handed control back. The page dialog completes the same ask.
    }
  }
  return onPage();
}

export function listAgentHands(board: Board): AgentHand[] {
  const hands: AgentHand[] = [
    { name: "get_board_state", kind: "read", on: "board" },
    { name: "inspect_card", kind: "read", on: "any card" },
  ];

  hands.push({ name: "load_scenario", kind: "write", on: "board" });
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

export async function syncWebmcp(
  api: HoldApi,
  signal: AbortSignal,
  onReady?: () => void,
) {
  const ctx = await waitForModelContext(signal);
  if (!ctx || signal.aborted) return;

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
    "Read the live LATCH board: scenario (A hourly / B retainer / C rush), phase, committed, per-term notes, special opinions, held cards, objections, cut terms, writable cards, and current text. Notes, opinions, and vetoes are binding. If committed is true the board is locked — call load_scenario with A for a fresh unlocked hourly board. Do not click A/B/C. If veto.cut is true, drop that term from the deal.",
    { type: "object", properties: {}, additionalProperties: false },
    async () => toolOk(boardSnapshot(api.getBoard())),
  );

  await read(
    "inspect_card",
    "Read one deal card by id, including hold state, veto (object / cut + optional comment), the human note or special opinion, and any pending rewrite. Follow the note and the veto. Treat kind=opinion as a term the human added.",
    {
      type: "object",
      properties: { card_id: CARD_ID },
      required: ["card_id"],
      additionalProperties: false,
    },
    async (input) => {
      const current = api.getBoard();
      const id = asCardId(input.card_id, current);
      if (!id) return toolError("unknown card_id");
      const card = getCard(current, id);
      return card ? toolOk(card) : toolError("card not found");
    },
  );

  await write(
    "propose_card_change",
    "Propose new text for a card. Does not apply it. Call get_board_state first. Fails if the board is locked, the card is on HOLD, or the card is cut. Follow that card's note and any veto.",
    {
      type: "object",
      properties: {
        card_id: CARD_ID,
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
      if (!current.started || current.committed) {
        return toolError("board is locked. Call load_scenario with A for a fresh unlocked hourly board.");
      }
      const id = asCardId(input.card_id, current);
      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!id) return toolError("unknown card_id");
      if (!text) return toolError("text is required");
      const target = getCard(current, id);
      if (!target) return toolError("card not found");
      if (target.held) {
        return toolError(`${id} is on HOLD. Call request_release or ask the human to let go.`);
      }
      if (target.veto?.cut) {
        return toolError(`${id} is cut from the deal. Do not rewrite it.`);
      }
      api.setBoard(proposeChange(current, id, text, "agent"));
      return toolOk({ ok: true, card_id: id, pending: text });
    },
    { untrusted: true },
  );

  await write(
    "apply_card_change",
    "Apply new text to a card and update the live board. Call get_board_state first. Fails if the board is locked, the card is on HOLD, or the card is cut. Indemnity (high risk) asks the human to confirm. Follow that card's note and any veto.",
    {
      type: "object",
      properties: {
        card_id: CARD_ID,
        text: { type: "string" },
      },
      required: ["card_id", "text"],
      additionalProperties: false,
    },
    async (input, extra) => {
      const current = api.getBoard();
      if (!current.started || current.committed) {
        return toolError("board is locked. Call load_scenario with A for a fresh unlocked hourly board.");
      }
      const id = asCardId(input.card_id, current);
      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!id) return toolError("unknown card_id");
      if (!text) return toolError("text is required");
      const target = getCard(current, id);
      if (!target) return toolError("card not found");
      if (target.held) {
        return toolError(`${id} is on HOLD. Call request_release or ask the human to let go.`);
      }
      if (target.veto?.cut) {
        return toolError(`${id} is cut from the deal. Do not rewrite it.`);
      }

      if (target.risk === "high") {
        const allowed = await askHuman(
          extra,
          api.confirm,
          `Apply this change to ${target.title}?\n\n${text}`,
        );
        if (!allowed) {
          if (extra?.signal?.aborted) return toolError("cancelled");
          return toolError("human rejected the apply");
        }
      }

      api.setBoard(applyChange(api.getBoard(), id, text, "agent"));
      return toolOk({ ok: true, card_id: id, text });
    },
    { untrusted: true },
  );

  await write(
    "request_release",
    "Ask the human to release a card that is on HOLD. Does not release it by itself unless the human confirms. Fails if the card is not held.",
    {
      type: "object",
      properties: {
        card_id: CARD_ID,
        reason: { type: "string" },
      },
      required: ["card_id"],
      additionalProperties: false,
    },
    async (input, extra) => {
      const current = api.getBoard();
      if (!current.started || current.committed) {
        return toolError("board is locked. Call load_scenario with A for a fresh unlocked hourly board.");
      }
      const id = asCardId(input.card_id, current);
      if (!id) return toolError("unknown card_id");
      const target = getCard(current, id);
      if (!target) return toolError("card not found");
      if (!target.held) return toolError(`${id} is not on HOLD`);

      const reason =
        typeof input.reason === "string" && input.reason.trim()
          ? input.reason.trim()
          : "No reason given.";

      const allowed = await askHuman(
        extra,
        api.confirm,
        `Release HOLD on ${target.title}?\n\n${reason}`,
      );
      if (!allowed) {
        if (extra?.signal?.aborted) return toolError("cancelled");
        return toolError("human kept the HOLD");
      }
      api.setBoard(releaseCard(api.getBoard(), id, "you"));
      return toolOk({ ok: true, released: id });
    },
  );

  await write(
    "commit_deal",
    "Freeze the whole board. Always asks the human to confirm. Irreversible in this session. Fails if the board is already locked.",
    { type: "object", properties: {}, additionalProperties: false },
    async (_input, extra) => {
      const current = api.getBoard();
      if (!current.started || current.committed) {
        return toolError("board is already locked. Call load_scenario with A to start a new deal.");
      }
      const allowed = await askHuman(
        extra,
        api.confirm,
        "Lock this deal and freeze the board?",
      );
      if (!allowed) {
        if (extra?.signal?.aborted) return toolError("cancelled");
        return toolError("human rejected commit");
      }
      api.setBoard(commitDeal(api.getBoard(), "agent"));
      return toolOk({ ok: true, committed: true });
    },
  );

  await write(
    "load_scenario",
    "Judge/demo fixture: replace the board with a fresh unlocked deal and clear committed. Not a production unlock of a signed contract. Use A after a locked board (hourly, 6 open). B is a retainer with indemnity already held. C is a rush with payment cut. Do not click A/B/C on the page.",
    {
      type: "object",
      properties: {
        scenario: {
          type: "string",
          enum: ["A", "B", "C"],
          description: "A hourly unlock. B retainer, indemnity held. C rush, payment cut.",
        },
      },
      required: ["scenario"],
      additionalProperties: false,
    },
    async (input) => {
      const id = asScenarioId(input.scenario);
      if (!id) return toolError("scenario must be A, B, or C");
      const next = loadScenario(id);
      api.setBoard(next);
      return toolOk({
        ok: true,
        scenario: id,
        committed: false,
        message: `Loaded ${id}. Board is unlocked.`,
      });
    },
  );

  if (!signal.aborted) onReady?.();
}
