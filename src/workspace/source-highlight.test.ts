import { describe, expect, it } from "vitest";
import {
  normalizeSourceHighlightRanges,
  offsetSourceHighlightRanges,
} from "./source-highlight";

describe("Workspace source highlighting", () => {
  it("bounds, sorts, and merges overlapping highlight ranges", () => {
    expect(
      normalizeSourceHighlightRanges(
        [
          { start: 8, end: 12 },
          { start: -4, end: 2 },
          { start: 1, end: 5 },
          { start: 5, end: 7 },
          { start: 3, end: 3 },
        ],
        10,
      ),
    ).toEqual([
      { start: 0, end: 7 },
      { start: 8, end: 10 },
    ]);
  });

  it("offsets player highlight ranges back into the editor source", () => {
    expect(offsetSourceHighlightRanges([{ start: 1, end: 4 }], 3)).toEqual([
      { start: 4, end: 7 },
    ]);
  });
});
