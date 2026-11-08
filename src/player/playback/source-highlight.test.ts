import { describe, expect, it } from "vitest";
import { trimSourceRange } from "./source-highlight";

//              0123456789012345678
const SOURCE = "X:1\nK:C\nC D E | G |";

describe("trimming an abcjs source range", () => {
  it("drops the separators around a note", () => {
    // abcjs measures a note up to the next one, so "D" arrives as " D ".
    expect(trimSourceRange(SOURCE, { start: 9, end: 12 })).toEqual({
      start: 10,
      end: 11,
    });
  });

  it("drops a leading newline", () => {
    expect(trimSourceRange(SOURCE, { start: 7, end: 9 })).toEqual({
      start: 8,
      end: 9,
    });
  });

  it("keeps a range that is already a token", () => {
    expect(trimSourceRange(SOURCE, { start: 12, end: 13 })).toEqual({
      start: 12,
      end: 13,
    });
  });

  it("collapses a range that holds only whitespace", () => {
    const range = trimSourceRange(SOURCE, { start: 9, end: 10 });

    expect(range).toEqual({ start: 10, end: 10 });
  });

  it("clamps ranges that run past the text", () => {
    expect(trimSourceRange(SOURCE, { start: 0, end: 200 })).toEqual({
      start: 0,
      end: SOURCE.length,
    });
  });
});
