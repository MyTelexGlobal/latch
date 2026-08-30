/**
 * Strip copy must follow `get_board_state`, including scenario C (Payment cut).
 * Also: a timed-out execute must not be allowed to open a confirm.
 */
import { describe, expect, it } from "vitest";
import { canOpenConfirm, describeAuthority } from "./authority";
import {
  boardSnapshot,
  commitDeal,
  holdCard,
  loadScenario,
} from "./board";

function expectStripMatchesSnapshot(
  board: ReturnType<typeof loadScenario>,
) {
  const line = describeAuthority(board);
  const snap = boardSnapshot(board);
  const titles = Object.fromEntries(
    board.cards.map((card) => [card.id, card.title]),
  );

  if (board.committed) {
    expect(line.kind).toBe("locked");
    expect(line.text).not.toMatch(/every term/);
    return;
  }

  if (snap.held.length === 0 && snap.cut.length === 0) {
    expect(line.kind).toBe("open");
    expect(line.text).toMatch(/every term/);
    return;
  }

  expect(line.kind).toBe("split");
  expect(line.text).not.toMatch(/every term/);
  for (const id of snap.held) {
    expect(line.text).toContain(`${titles[id]} latched`);
  }
  for (const id of snap.cut) {
    expect(line.text).toContain(`${titles[id]} cut from the deal`);
  }
}

describe("describeAuthority", () => {
  it("says every term only when nothing is held or cut", () => {
    expectStripMatchesSnapshot(loadScenario("A"));
  });

  it("names a cut Payment on scenario C instead of every term", () => {
    const board = loadScenario("C");
    const line = describeAuthority(board);
    expectStripMatchesSnapshot(board);
    expect(line.text).toMatch(/Agent still writes/);
    expect(line.text).not.toMatch(/Payment(?! cut)/);
  });

  it("names a held card and the remaining writable terms", () => {
    const board = holdCard(loadScenario("A"), "indemnity", "you");
    const line = describeAuthority(board);
    expectStripMatchesSnapshot(board);
    expect(line.text).toMatch(/Rate/);
  });

  it("stays honest on B, a held+cut mix, and a locked board", () => {
    expectStripMatchesSnapshot(loadScenario("B"));
    expectStripMatchesSnapshot(
      holdCard(loadScenario("C"), "indemnity", "you"),
    );
    expectStripMatchesSnapshot(commitDeal(loadScenario("A"), "you"));
  });
});

describe("canOpenConfirm", () => {
  it("blocks a dialog after the execute has settled or aborted", () => {
    expect(canOpenConfirm(true, false)).toBe(false);
    expect(canOpenConfirm(false, true)).toBe(false);
    expect(canOpenConfirm(false, false)).toBe(true);
  });
});
