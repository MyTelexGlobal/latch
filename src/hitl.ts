/**
 * Host HITL and post-confirm write guards.
 *
 * Kept separate from React so the race cases have ordinary unit tests:
 * abort during confirm, a host wrapper that throws synchronously, and a
 * board that changes while the dialog is open.
 */

/** Subset of the WebMCP `execute` extra that HITL actually reads. */
export type HitlExtra = {
  signal?: AbortSignal;
  requestUserInteraction?: <T>(run: () => Promise<T> | T) => Promise<T>;
};

/** Fields that decide whether the board still accepts writes. */
export type BoardLock = {
  started: boolean;
  committed: boolean;
};

/** Fields that decide whether one card still accepts writes. */
export type CardLock = {
  held: boolean;
  veto: { cut: boolean } | null;
};

/** True when the execute signal already cancelled the call. */
export function aborted(extra?: HitlExtra) {
  return Boolean(extra?.signal?.aborted);
}

/**
 * Offer the host the same promise the page dialog already owns.
 * Never throw to `execute`. Never become the thing `execute` awaits.
 */
export function offerHostInteraction(
  extra: HitlExtra | undefined,
  decision: Promise<boolean>,
): void {
  const wrap = extra?.requestUserInteraction;
  if (typeof wrap !== "function") return;
  try {
    void Promise.resolve(wrap(() => decision)).catch(() => {
      /* Host wrap settled later. The page click already owns the answer. */
    });
  } catch {
    /* Sync throw from a subset host. The page dialog stays up. */
  }
}

/** Agent-readable lock copy, or null when writes may proceed. */
export function lockedReason(board: BoardLock): string | null {
  if (!board.started || board.committed) {
    return "board is locked. Call load_scenario with A for a fresh unlocked hourly board.";
  }
  return null;
}

/**
 * Recheck immediately before `applyChange`.
 * Covers abort, a commit that landed during the dialog, HOLD, and cut.
 */
export function applyBlockReason(
  extra: HitlExtra | undefined,
  board: BoardLock,
  card: CardLock | undefined,
  id: string,
): string | null {
  if (aborted(extra)) return "cancelled";
  const lock = lockedReason(board);
  if (lock) return lock;
  if (!card || card.held) {
    return `${id} is on HOLD. Call request_release or ask the human to let go.`;
  }
  if (card.veto?.cut) return `${id} is cut from the deal. Do not rewrite it.`;
  return null;
}

/** Recheck immediately before `releaseCard`. The card must still be held. */
export function releaseBlockReason(
  extra: HitlExtra | undefined,
  board: BoardLock,
  card: CardLock | undefined,
  id: string,
): string | null {
  if (aborted(extra)) return "cancelled";
  const lock = lockedReason(board);
  if (lock) return lock;
  if (!card?.held) return `${id} is not on HOLD`;
  return null;
}

/** Recheck immediately before `commitDeal`. */
export function commitBlockReason(
  extra: HitlExtra | undefined,
  board: BoardLock,
): string | null {
  if (aborted(extra)) return "cancelled";
  if (!board.started || board.committed) {
    return "board is already locked. Call load_scenario with A to start a new deal.";
  }
  return null;
}
