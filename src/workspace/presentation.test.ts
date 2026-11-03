import { describe, expect, it, vi } from "vitest";
import {
  applyWorkspaceEditorWrap,
  applyWorkspaceLayoutMode,
  applyWorkspaceTheme,
  getSelectedWorkspaceThemeMode,
} from "./presentation";

describe("Workspace presentation helpers", () => {
  it("applies editor wrapping and syncs the highlight mirror", () => {
    const editorFrame = document.createElement("section");
    const input = document.createElement("textarea");
    const sync = vi.fn();
    input.scrollLeft = 120;

    const editorWrap = applyWorkspaceEditorWrap(
      editorFrame,
      input,
      "enabled",
      sync,
    );

    expect(editorWrap).toBe("enabled");
    expect(editorFrame.dataset.editorWrap).toBe("enabled");
    expect(input.wrap).toBe("soft");
    expect(input.scrollLeft).toBe(0);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("resolves selected theme modes from the form", () => {
    const form = document.createElement("form") as HTMLFormElement & {
      themeMode?: { value: string };
    };
    form.themeMode = { value: "dark" };

    expect(getSelectedWorkspaceThemeMode(form)).toBe("dark");

    form.themeMode.value = "nope";
    expect(getSelectedWorkspaceThemeMode(form)).toBe("auto");
  });

  it("applies resolved theme and explicit layout classes", () => {
    const documentElement = document.createElement("html");
    const workspaceShell = document.createElement("section");

    applyWorkspaceTheme("auto", true, documentElement);
    expect(documentElement.dataset.theme).toBe("dark");
    expect(documentElement.dataset.themeMode).toBe("auto");

    applyWorkspaceLayoutMode(workspaceShell, "horizontal");
    expect(workspaceShell.classList.contains("layout-split")).toBe(true);
    expect(workspaceShell.classList.contains("layout-stacked")).toBe(false);

    applyWorkspaceLayoutMode(workspaceShell, "vertical");
    expect(workspaceShell.classList.contains("layout-split")).toBe(false);
    expect(workspaceShell.classList.contains("layout-stacked")).toBe(true);
  });
});
