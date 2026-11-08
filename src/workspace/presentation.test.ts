import { describe, expect, it } from "vitest";
import {
  applyWorkspaceLayoutMode,
  applyWorkspaceTheme,
  getSelectedWorkspaceThemeMode,
} from "./presentation";

describe("Workspace presentation helpers", () => {
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
