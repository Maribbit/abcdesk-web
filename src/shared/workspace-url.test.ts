import { describe, expect, it } from "vitest";
import { decodeWorkspaceAbcHash, encodeWorkspaceAbcHash } from "./workspace-url";

describe("Workspace URL helpers", () => {
  it("round-trips ABC text through the Workspace hash", () => {
    const abcText = "X: 1\nT: Hash Test\nK: C\nC D E F |]";
    const hash = encodeWorkspaceAbcHash(abcText);

    expect(hash).toContain("abc=");
    expect(decodeWorkspaceAbcHash(hash)).toBe(abcText);
    expect(decodeWorkspaceAbcHash(`#${hash}`)).toBe(abcText);
  });

  it("returns null for non-Workspace hashes", () => {
    expect(decodeWorkspaceAbcHash("#section-1")).toBeNull();
  });
});
