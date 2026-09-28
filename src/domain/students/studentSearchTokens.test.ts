import { describe, it, expect } from "vitest";

import { buildStudentSearchTokens } from "./studentSearchTokens";

describe("buildStudentSearchTokens (domain)", () => {
  it("empty -> empty", () => expect(buildStudentSearchTokens()).toEqual([]));
  it("single word 2\n..len", () => expect(buildStudentSearchTokens("Ahmad")).toEqual(["ah","ahm","ahma","ahmad"]));
  it("caps at 20", () => { const w="a".repeat(25); const t=buildStudentSearchTokens(w); expect(t.length).toBe(19); expect(t.at(-1).length).toBe(20); });
  it("single-char -> no token", () => { expect(buildStudentSearchTokens("A")).toEqual([]); expect(buildStudentSearchTokens("A B")).toEqual([]); });
  it("merges", () => { const t=buildStudentSearchTokens("Ahmad Dani", "Ahmad Dani"); expect(t).toContain("ah"); expect(t).toContain("da"); });
  it("collapses space", () => expect(buildStudentSearchTokens("  Ahmad   Dani  ")).toEqual(buildStudentSearchTokens("Ahmad Dani")));
});
