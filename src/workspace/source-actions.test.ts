import { describe, expect, it } from "vitest";
import {
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
    const playFromCursorButton = document.createElement("button");
    const targets = {
      copySourceButton,
      exportAbcButton,
      playFromCursorButton,
      sourceStats,
    };

    updateWorkspaceSourceStats(targets, "X:1");

    expect(sourceStats.textContent).toBe("1 lines, 3 chars");
    expect(copySourceButton.disabled).toBe(false);
    expect(exportAbcButton.disabled).toBe(false);
    expect(playFromCursorButton.disabled).toBe(false);

    updateWorkspaceSourceStats(targets, "");

    expect(sourceStats.textContent).toBe("0 lines, 0 chars");
    expect(copySourceButton.disabled).toBe(true);
    expect(exportAbcButton.disabled).toBe(true);
    expect(playFromCursorButton.disabled).toBe(true);
  });

  it("normalizes ABC import errors", () => {
    expect(getAbcImportErrorMessage(new Error("Too large"))).toBe("Too large");
    expect(getAbcImportErrorMessage("nope")).toBe("ABC import failed");
  });
});
