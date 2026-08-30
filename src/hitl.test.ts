/**
 * Race coverage for the confirm path.
 *
 * 1. Host `requestUserInteraction` throws synchronously.
 * 2. Host wrap rejects later.
 * 3. Abort / lock / HOLD after the human has already seen the dialog.
 */
import { describe, expect, it } from "vitest";
import {
  aborted,
  applyBlockReason,
  commitBlockReason,
  offerHostInteraction,
  releaseBlockReason,
} from "./hitl";
import {
  applyChange,
  createIdleBoard,
  holdCard,
  loadScenario,
  writableCardIds,
} from "./board";

describe("offerHostInteraction", () => {
  it("survives a host wrapper that throws synchronously", async () => {
    let decided = false;
    const decision = Promise.resolve(true).then((ok) => {
      decided = true;
      return ok;
    });
    expect(() =>
      offerHostInteraction(
        {
          requestUserInteraction: () => {
            throw new Error("requestUserInteraction is not supported");
          },
        },
        decision,
      ),
    ).not.toThrow();
    await expect(decision).resolves.toBe(true);
    expect(decided).toBe(true);
  });

  it("survives a host wrapper that rejects", async () => {
    const decision = Promise.resolve(true);
    offerHostInteraction(
      {
        requestUserInteraction: () => Promise.reject(new Error("no handler")),
      },
      decision,
    );
    await expect(decision).resolves.toBe(true);
  });
});

describe("post-confirm guards", () => {
  it("treats an aborted signal as cancelled before mutate", () => {
    const extra = { signal: AbortSignal.abort() };
    expect(aborted(extra)).toBe(true);
    expect(
      applyBlockReason(extra, { started: true, committed: false }, { held: false, veto: null }, "rate"),
    ).toBe("cancelled");
    expect(
      releaseBlockReason(extra, { started: true, committed: false }, { held: true, veto: null }, "indemnity"),
    ).toBe("cancelled");
    expect(commitBlockReason(extra, { started: true, committed: false })).toBe("cancelled");
  });

  it("refuses apply when the board is locked during the dialog", () => {
    expect(
      applyBlockReason(
        {},
        { started: true, committed: true },
        { held: false, veto: null },
        "rate",
      ),
    ).toMatch(/locked/);
  });

  it("refuses apply when the card is held during the dialog", () => {
    const board = holdCard(createIdleBoard(), "indemnity", "you");
    expect(writableCardIds(board)).not.toContain("indemnity");
    expect(writableCardIds(board)).toContain("rate");
    const card = board.cards.find((item) => item.id === "indemnity");
    expect(
      applyBlockReason({}, board, card, "indemnity"),
    ).toMatch(/HOLD/);
    const after = applyChange(board, "indemnity", "should not land", "agent");
    expect(after.cards.find((item) => item.id === "indemnity")?.text).toBe(
      board.cards.find((item) => item.id === "indemnity")?.text,
    );
  });

  it("refuses apply when the card is cut, as on scenario C", () => {
    const board = loadScenario("C");
    expect(writableCardIds(board)).not.toContain("payment");
    const card = board.cards.find((item) => item.id === "payment");
    expect(applyBlockReason({}, board, card, "payment")).toMatch(/cut/);
    const after = applyChange(board, "payment", "should not land", "agent");
    expect(after.cards.find((item) => item.id === "payment")?.text).toBe(
      board.cards.find((item) => item.id === "payment")?.text,
    );
  });
});
