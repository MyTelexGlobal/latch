/**
 * Copy for the authority strip.
 *
 * Must match `boardSnapshot`: held, cut, and writable. Scenario C cuts
 * Payment without a HOLD — saying "every term" would contradict the tools.
 */

import type { Board } from "./board";

export type AuthorityKind = "locked" | "open" | "split";

export type AuthorityCopy = {
  kind: AuthorityKind;
  text: string;
};

function titles(
  board: Board,
  take: (card: Board["cards"][number]) => boolean,
) {
  return board.cards.filter(take).map((card) => card.title);
}

/** Sentence under the tabs. Same facts as `get_board_state`. */
export function describeAuthority(board: Board): AuthorityCopy {
  if (board.committed) {
    return { kind: "locked", text: "Board locked. The agent cannot write." };
  }

  const held = titles(board, (card) => card.held);
  const cut = titles(board, (card) => Boolean(card.veto?.cut));
  const open = titles(board, (card) => !card.held && !card.veto?.cut);

  if (held.length === 0 && cut.length === 0) {
    return {
      kind: "open",
      text: "Agent may write every term. HOLD one card to revoke that grant only.",
    };
  }

  const parts: string[] = [];
  if (held.length) parts.push(`${held.join(", ")} latched`);
  if (cut.length) parts.push(`${cut.join(", ")} cut from the deal`);
  const rest = open.length
    ? `Agent still writes ${open.join(", ")}.`
    : "Agent writes nothing.";
  return { kind: "split", text: `${parts.join(". ")}. ${rest}` };
}

/**
 * A timed-out execute must not paint a dialog after abort.
 * Used by `useBoardConfirm` before `setPrompt`.
 */
export function canOpenConfirm(settled: boolean, signalAborted: boolean) {
  return !settled && !signalAborted;
}
