import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyWorkspaceLayoutMode,
  applyWorkspaceTheme,
  getSelectedWorkspaceThemeMode,
} from "./presentation";

describe("Workspace presentation helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelector('meta[name="theme-color"]')?.remove();
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

  it("paints the address bar with the wall's own colour", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#e8ebec";
    document.head.append(meta);

    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => " #15191b ",
    } as unknown as CSSStyleDeclaration);

    applyWorkspaceTheme("dark", false, document.documentElement);
    expect(meta.content).toBe("#15191b");
  });
});
