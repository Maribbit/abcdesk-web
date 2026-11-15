import { describe, expect, it } from "vitest";
import {
  applyModifierLabels,
  isApplePlatform,
  MODIFIER_LABELS,
} from "./shortcut-labels";

describe("isApplePlatform", () => {
  it("reads the modern platform hint first", () => {
    expect(isApplePlatform({ userAgentData: { platform: "macOS" } })).toBe(true);
    expect(isApplePlatform({ userAgentData: { platform: "Windows" } })).toBe(false);
  });

  it("falls back to the legacy platform string", () => {
    expect(isApplePlatform({ platform: "MacIntel" })).toBe(true);
    expect(isApplePlatform({ platform: "Win32" })).toBe(false);
    expect(isApplePlatform({ platform: "Linux x86_64" })).toBe(false);
  });

  it("reads the agent string when the platform says nothing", () => {
    expect(
      isApplePlatform({
        platform: "",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      }),
    ).toBe(true);
    expect(
      isApplePlatform({
        platform: "",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0",
      }),
    ).toBe(false);
  });

  it("treats an unknown machine as the word Ctrl", () => {
    expect(isApplePlatform({})).toBe(false);
  });
});

describe("applyModifierLabels", () => {
  function build(): Document {
    const document = window.document.implementation.createHTMLDocument("about");
    document.body.innerHTML =
      '<dl><dt><kbd data-mod-key>Ctrl</kbd><kbd>/</kbd></dt><dd>Comment</dd></dl>';
    return document;
  }

  it("writes the Apple glyph into every modifier chip", () => {
    const document = build();
    applyModifierLabels(document, true);
    const chips = Array.from(document.querySelectorAll("kbd")).map(
      (chip) => chip.textContent,
    );
    expect(chips).toEqual([MODIFIER_LABELS.apple, "/"]);
  });

  it("leaves the word on every other machine", () => {
    const document = build();
    applyModifierLabels(document, false);
    expect(document.querySelector("[data-mod-key]")?.textContent).toBe("Ctrl");
  });

  it("does nothing when the sheet has no key table", () => {
    const document = window.document.implementation.createHTMLDocument("about");
    document.body.innerHTML = "<p>No keys here</p>";
    expect(() => applyModifierLabels(document, true)).not.toThrow();
  });
});
