import { describe, expect, it } from "vitest";
import { formatDocumentTitle } from "./document-title";

describe("formatDocumentTitle", () => {
  it("puts the tune first and the app second", () => {
    expect(formatDocumentTitle("Lanterns on the Tide")).toBe(
      "Lanterns on the Tide — ABC Desk Web",
    );
  });

  it("folds the whitespace a T: line can carry into one line", () => {
    expect(formatDocumentTitle("  Lanterns\n  on the Tide  ")).toBe(
      "Lanterns on the Tide — ABC Desk Web",
    );
  });

  it("falls back to the app when the sheet has no name", () => {
    expect(formatDocumentTitle(null)).toBe("ABC Desk Web");
    expect(formatDocumentTitle(undefined)).toBe("ABC Desk Web");
    expect(formatDocumentTitle("   ")).toBe("ABC Desk Web");
  });
});
