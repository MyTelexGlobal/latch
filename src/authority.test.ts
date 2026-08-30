/**
 * Strip copy must follow `get_board_state`, including scenario C (Payment cut).
 * Also: a timed-out execute must not be allowed to open a confirm.
 */
import { describe, expect, it } from "vitest";
import { canOpenConfirm, describeAuthority } from "./authority";
import { holdCard, loadScenario } from "./board";

describe("describeAuthority", () => {
  it("says every term only when nothing is held or cut", () => {
    const line = describeAuthority(loadScenario("A"));
    expect(line.kind).toBe("open");
    expect(line.text).toMatch(/every term/);
  });

  it("names a cut Payment on scenario C instead of every term", () => {
    const line = describeAuthority(loadScenario("C"));
    expect(line.kind).toBe("split");
    expect(line.text).toMatch(/Payment cut from the deal/);
    expect(line.text).not.toMatch(/every term/);
    expect(line.text).toMatch(/Agent still writes/);
    expect(line.text).not.toMatch(/Payment(?! cut)/);
  });

  it("names a held card and the remaining writable terms", () => {
    const line = describeAuthority(holdCard(loadScenario("A"), "indemnity", "you"));
    expect(line.kind).toBe("split");
    expect(line.text).toMatch(/Indemnity latched/);
    expect(line.text).toMatch(/Rate/);
    expect(line.text).not.toMatch(/every term/);
  });
});

describe("canOpenConfirm", () => {
  it("blocks a dialog after the execute has settled or aborted", () => {
    expect(canOpenConfirm(true, false)).toBe(false);
    expect(canOpenConfirm(false, true)).toBe(false);
    expect(canOpenConfirm(false, false)).toBe(true);
  });
});
