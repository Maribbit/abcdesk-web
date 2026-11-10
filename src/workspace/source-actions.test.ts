import { describe, expect, it, vi } from "vitest";
import { decodeWorkspaceAbcHash } from "../shared/workspace-url";
import {
  copyWorkspaceShareLink,
  getAbcImportErrorMessage,
  getSourceStatsText,
  updateWorkspaceSourceStats,
} from "./source-actions";

describe("Workspace source actions", () => {
  it("formats source statistics", () => {
    expect(getSourceStatsText("")).toBe("0 lines, 0 chars");
    expect(getSourceStatsText("X:1\nK:C\nC|")).toBe("3 lines, 10 chars");
  });

  it("updates source stats and disables empty-source actions", () => {
    const sourceStats = document.createElement("span");
    const copySourceButton = document.createElement("button");
    const exportAbcButton = document.createElement("button");
    const shareButton = document.createElement("button");
    const targets = {
      copySourceButton,
      exportAbcButton,
      shareButton,
      sourceStats,
    };

    updateWorkspaceSourceStats(targets, "X:1");

    expect(sourceStats.textContent).toBe("1 lines, 3 chars");
    expect(copySourceButton.disabled).toBe(false);
    expect(exportAbcButton.disabled).toBe(false);
    expect(shareButton.disabled).toBe(false);

    updateWorkspaceSourceStats(targets, "");

    expect(sourceStats.textContent).toBe("0 lines, 0 chars");
    expect(copySourceButton.disabled).toBe(true);
    expect(exportAbcButton.disabled).toBe(true);
    expect(shareButton.disabled).toBe(true);
  });

  it("normalizes ABC import errors", () => {
    expect(getAbcImportErrorMessage(new Error("Too large"))).toBe("Too large");
    expect(getAbcImportErrorMessage("nope")).toBe("ABC import failed");
  });

  it("copies a share link that carries the tune in its fragment", async () => {
    const sourceStats = document.createElement("span");
    const writeText = vi.fn(async (text: string) => text.length);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const sourceText = "X: 1\nT: Shared\nK: C\nC D E F |]";

    await copyWorkspaceShareLink(sourceText, sourceStats, () => undefined);

    const url = writeText.mock.calls[0][0];
    const { origin, pathname } = window.location;
    expect(url.startsWith(`${origin}${pathname}#abc=`)).toBe(true);
    expect(await decodeWorkspaceAbcHash(url.slice(url.indexOf("#") + 1))).toBe(
      sourceText,
    );
    expect(sourceStats.textContent).toBe("Link copied");
  });
});
