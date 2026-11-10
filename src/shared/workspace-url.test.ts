import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeWorkspaceAbcHash,
  encodeWorkspaceAbcHash,
} from "./workspace-url";

const ABC_TEXT = "X: 1\nT: Hash Test\nK: C\nC D E F |]";
const LONG_TEXT = `X: 1\nT: Long\nK: C\n${"C D E F G A B c |\n".repeat(40)}`;

describe("Workspace URL helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips ABC text through the Workspace hash", async () => {
    const hash = await encodeWorkspaceAbcHash(ABC_TEXT);

    expect(hash).toContain("abc=");
    expect(await decodeWorkspaceAbcHash(hash)).toBe(ABC_TEXT);
    expect(await decodeWorkspaceAbcHash(`#${hash}`)).toBe(ABC_TEXT);
  });

  it("compresses a tune to a fraction of its percent-encoded size", async () => {
    const compressed = await encodeWorkspaceAbcHash(LONG_TEXT);
    const plain = `abc=${encodeURIComponent(LONG_TEXT)}`;

    expect(compressed.length).toBeLessThan(plain.length / 2);
    expect(await decodeWorkspaceAbcHash(compressed)).toBe(LONG_TEXT);
  });

  it("keeps the payload inside what a URL may carry", async () => {
    const hash = await encodeWorkspaceAbcHash(LONG_TEXT);
    const payload = hash.slice(hash.indexOf("=") + 1);

    // base64url: nothing that a mail client, a chat window or a query string
    // has a reason to escape.
    expect(payload).toMatch(/^z1\.[A-Za-z0-9_-]+$/);
  });

  it("falls back to plain text where the browser cannot compress", async () => {
    vi.stubGlobal("CompressionStream", undefined);

    const hash = await encodeWorkspaceAbcHash(ABC_TEXT);

    expect(hash).toBe(`abc=${encodeURIComponent(ABC_TEXT)}`);
    expect(await decodeWorkspaceAbcHash(hash)).toBe(ABC_TEXT);
  });

  it("opens a link written before compression existed", async () => {
    const legacy = `#abc=${encodeURIComponent(ABC_TEXT)}`;

    expect(await decodeWorkspaceAbcHash(legacy)).toBe(ABC_TEXT);
  });

  it("returns null for non-Workspace hashes and broken payloads", async () => {
    expect(await decodeWorkspaceAbcHash("#section-1")).toBeNull();
    expect(await decodeWorkspaceAbcHash("#abc=z1.not-base64!")).toBeNull();
  });
});
