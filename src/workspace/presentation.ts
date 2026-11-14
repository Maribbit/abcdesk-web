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
  applyAddressBarColor(documentElement);
}

/**
 * The address bar sits right above the wall, so it takes the wall's colour
 * rather than a second opinion about it. Reading the token keeps the hex in
 * the stylesheet, where the rest of the palette lives.
 */
function applyAddressBarColor(documentElement: HTMLElement): void {
  const meta = documentElement.ownerDocument.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) return;

  const wall = getComputedStyle(documentElement)
    .getPropertyValue("--workspace-bg")
    .trim();
  if (wall) meta.content = wall;
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
