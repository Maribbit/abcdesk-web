import { describe, expect, it } from "vitest";
import { createOpenWorkspaceMessage, isOpenWorkspaceMessage } from "./messages";

describe("extension messages", () => {
  it("creates and validates Open Workspace messages", () => {
    const message = createOpenWorkspaceMessage("X: 1\nK: C\nC |]");

    expect(isOpenWorkspaceMessage(message)).toBe(true);
    expect(message).toEqual({
      type: "OPEN_WORKSPACE",
      abcText: "X: 1\nK: C\nC |]",
    });
  });

  it("rejects malformed Open Workspace messages", () => {
    expect(isOpenWorkspaceMessage(null)).toBe(false);
    expect(isOpenWorkspaceMessage({ type: "OPEN_WORKSPACE" })).toBe(false);
    expect(isOpenWorkspaceMessage({ type: "OPEN_WORKSPACE", abcText: 1 })).toBe(
      false
    );
    expect(isOpenWorkspaceMessage({ type: "OTHER", abcText: "X: 1" })).toBe(
      false
    );
  });
});