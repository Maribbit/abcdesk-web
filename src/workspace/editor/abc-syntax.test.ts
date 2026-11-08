import { describe, expect, it } from "vitest";
import { classifyAbcSource } from "./abc-syntax";

describe("ABC syntax scanner", () => {
  it("marks header field lines as metadata", () => {
    expect(classifyAbcSource("X: 1\nK: C")).toEqual([
      { from: 0, to: 4, kind: "field" },
      { from: 5, to: 9, kind: "field" },
    ]);
  });

  it("marks bar lines inside music and leaves notes alone", () => {
    expect(classifyAbcSource("CDEF | GABc |]")).toEqual([
      { from: 5, to: 6, kind: "bar" },
      { from: 12, to: 14, kind: "bar" },
    ]);
  });

  it("marks repeat signs as one run", () => {
    expect(classifyAbcSource("|: C :|")).toEqual([
      { from: 0, to: 2, kind: "bar" },
      { from: 5, to: 7, kind: "bar" },
    ]);
  });

  it("gives a comment the rest of its line, and stops bar scanning there", () => {
    expect(classifyAbcSource("C | % not a | bar")).toEqual([
      { from: 2, to: 3, kind: "bar" },
      { from: 4, to: 17, kind: "comment" },
    ]);
  });

  it("keeps offsets across lines and empty lines", () => {
    expect(classifyAbcSource("X: 1\n\nT: Two\n")).toEqual([
      { from: 0, to: 4, kind: "field" },
      { from: 6, to: 12, kind: "field" },
    ]);
  });
});
