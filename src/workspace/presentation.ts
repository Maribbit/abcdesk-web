import {
  DEFAULT_THEME_MODE,
  normalizeThemeMode,
  type LayoutMode,
  type ThemeMode,
} from "../shared/settings";

export function getSelectedWorkspaceThemeMode(
  themeModeForm: HTMLFormElement,
): ThemeMode {
  return normalizeThemeMode(
    themeModeForm.themeMode.value || DEFAULT_THEME_MODE,
  );
}

export function applyWorkspaceTheme(
  themeMode: ThemeMode,
  prefersDark: boolean,
  documentElement: HTMLElement = document.documentElement,
): void {
  const resolvedTheme =
    themeMode === "auto" ? (prefersDark ? "dark" : "light") : themeMode;

  documentElement.dataset.theme = resolvedTheme;
  documentElement.dataset.themeMode = themeMode;
}

export function applyWorkspaceLayoutMode(
  workspaceShell: HTMLElement,
  layoutMode: LayoutMode,
): void {
  if (layoutMode === "horizontal") {
    workspaceShell.classList.add("layout-split");
    workspaceShell.classList.remove("layout-stacked");
  } else if (layoutMode === "vertical") {
    workspaceShell.classList.add("layout-stacked");
    workspaceShell.classList.remove("layout-split");
  } else {
    workspaceShell.classList.remove("layout-split", "layout-stacked");
  }
}
