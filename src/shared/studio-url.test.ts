import { describe, expect, it } from "vitest";
import { decodeStudioAbcHash, encodeStudioAbcHash } from "./studio-url";

describe("Studio URL helpers", () => {
  it("round-trips ABC text through the Studio hash", () => {
    const abcText = "X: 1\nT: Hash Test\nK: C\nC D E F |]";
    const hash = encodeStudioAbcHash(abcText);

    expect(hash).toContain("abc=");
    expect(decodeStudioAbcHash(hash)).toBe(abcText);
    expect(decodeStudioAbcHash(`#${hash}`)).toBe(abcText);
  });

  it("returns null for non-Studio hashes", () => {
    expect(decodeStudioAbcHash("#section-1")).toBeNull();
  });
});
