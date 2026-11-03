import {
  normalizeLayoutMode,
  type AbcAutoCheck,
  type EditorWrap,
  type KeyboardVisibility,
  type LayoutMode,
} from "../shared/settings";
import { decodeWorkspaceAbcHash } from "../shared/workspace-url";
import type { SourceHighlightRange } from "../player/renderer";
import {
  createSourceHighlightFragment,
  normalizeSourceHighlightRanges,
} from "./source-highlight";
import { checkWorkspaceAbcSource, hideQualityPanel } from "./quality-report";
import {
  loadWorkspaceSettings,
  saveWorkspaceAbcAutoCheck,
  saveWorkspaceEditorWrap,
  saveWorkspaceThemeMode,
  saveWorkspaceLayoutMode,
} from "./settings-store";
import { createWorkspaceSplitLayout } from "./split-layout";
import {
  copyWorkspaceSourceToClipboard,
  exportWorkspaceAbcFile,
  importWorkspaceAbcFile,
  updateWorkspaceSourceStats,
} from "./source-actions";
import {
  applyWorkspaceEditorWrap,
  applyWorkspaceLayoutMode,
  applyWorkspaceTheme,
  getSelectedWorkspaceThemeMode,
} from "./presentation";
import { createWorkspaceRenderController } from "./rendering";

const WORKSPACE_SOURCE_STORAGE_KEY = "abcdeskWorkspaceAbcText";
const RENDER_DEBOUNCE_MS = 350;

const EXAMPLE_ABC = `X: 1
T: ABC Desk Web Example
M: 4/4
L: 1/4
Q: 1/4=108
K: C
C D E F | G A B c | c B A G | F E D C |
E2 D2 | C4 |]`;

const input = document.getElementById("abcInput") as HTMLTextAreaElement;
const editorFrame = document.getElementById("abcEditorFrame") as HTMLElement;
const sourceHighlightMirror = document.getElementById(
  "abcHighlightMirror",
) as HTMLElement;
const workspaceShell = document.querySelector(".workspace-shell") as HTMLElement;
const sourceElement = document.getElementById("workspaceSource") as HTMLElement;
const renderMount = document.getElementById("renderMount") as HTMLElement;
const editorPane = document.querySelector(".editor-pane") as HTMLElement;
const workspaceResizer = document.getElementById("workspaceResizer") as HTMLElement;
const sourceStats = document.getElementById("sourceStats") as HTMLElement;
const renderStatus = document.getElementById("renderStatus") as HTMLElement;
const qualityPanel = document.getElementById("qualityPanel") as HTMLElement;
const themeModeForm = document.getElementById(
  "themeModeForm",
) as HTMLFormElement;
const layoutModeForm = document.getElementById(
  "layoutModeForm",
) as HTMLFormElement;
const autoCheckInput = document.getElementById(
  "autoCheckInput",
) as HTMLInputElement;
const editorWrapInput = document.getElementById(
  "editorWrapInput",
) as HTMLInputElement;
const copySourceButton = document.getElementById(
  "copySourceButton",
) as HTMLButtonElement;
const importAbcButton = document.getElementById(
  "importAbcButton",
) as HTMLButtonElement;
const abcFileInput = document.getElementById(
  "abcFileInput",
) as HTMLInputElement;
const exportAbcButton = document.getElementById(
  "exportAbcButton",
) as HTMLButtonElement;
const loadExampleButton = document.getElementById(
  "loadExampleButton",
) as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const stackedLayoutQuery = window.matchMedia("(max-width: 860px)");

let currentKeyboardVisibility: KeyboardVisibility = "visible";
let currentAbcAutoCheck: AbcAutoCheck = "enabled";
let currentEditorWrap: EditorWrap = "disabled";
let explicitLayoutMode: LayoutMode = "auto";
let currentSourceHighlightKey = "";

const splitLayout = createWorkspaceSplitLayout({
  editorPane,
  resizer: workspaceResizer,
  stackedLayoutQuery,
  workspaceShell,
  getLayoutMode: () => explicitLayoutMode,
});
const renderController = createWorkspaceRenderController({
  clearSourceHighlight,
  getKeyboardVisibility: () => currentKeyboardVisibility,
  getThemeMode: () => getSelectedWorkspaceThemeMode(themeModeForm),
  input,
  renderDelayMs: RENDER_DEBOUNCE_MS,
  renderMount,
  renderStatus,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight,
});

void initializeWorkspace();

async function initializeWorkspace(): Promise<void> {
  splitLayout.restoreSizes();
  splitLayout.updateOrientation();
  window.requestAnimationFrame(() => splitLayout.clampRestoredSize());

  input.value =
    readAbcFromUrlHash() ??
    window.localStorage.getItem(WORKSPACE_SOURCE_STORAGE_KEY) ??
    EXAMPLE_ABC;
  window.localStorage.setItem(WORKSPACE_SOURCE_STORAGE_KEY, input.value);

  const settings = await loadWorkspaceSettings();
  currentKeyboardVisibility = settings.keyboardVisibility;
  currentAbcAutoCheck = settings.abcAutoCheck;
  currentEditorWrap = settings.editorWrap;
  themeModeForm.themeMode.value = settings.themeMode;
  layoutModeForm.layoutMode.value = settings.layoutMode;
  explicitLayoutMode = settings.layoutMode;

  autoCheckInput.checked = settings.abcAutoCheck === "enabled";
  applyEditorWrap(settings.editorWrap);
  applyWorkspaceTheme(settings.themeMode, colorSchemeQuery.matches);
  applyWorkspaceLayoutMode(workspaceShell, settings.layoutMode);

  input.addEventListener("input", () => {
    clearSourceHighlight();
    updateSourceStats();
    window.localStorage.setItem(WORKSPACE_SOURCE_STORAGE_KEY, input.value);
    hideQualityPanel(qualityPanel);
    renderStatus.textContent = "Checking...";
    renderController.scheduleRender();
  });
  input.addEventListener("scroll", syncSourceHighlightScroll);

  autoCheckInput.addEventListener("change", () => {
    void updateAbcAutoCheckSetting(
      autoCheckInput.checked ? "enabled" : "disabled",
    );
  });
  editorWrapInput.addEventListener("change", () => {
    void updateEditorWrapSetting(
      editorWrapInput.checked ? "enabled" : "disabled",
    );
  });
  copySourceButton.addEventListener("click", () => {
    void copySourceToClipboard();
  });
  importAbcButton.addEventListener("click", () => {
    abcFileInput.click();
  });
  abcFileInput.addEventListener("change", () => {
    void importSelectedAbcFile();
  });
  exportAbcButton.addEventListener("click", () => {
    exportCurrentAbcFile();
  });
  loadExampleButton.addEventListener("click", () => {
    setInputValue(EXAMPLE_ABC);
    renderController.renderCurrentInput();
  });
  clearButton.addEventListener("click", () => {
    setInputValue("");
    renderController.renderCurrentInput();
    input.focus();
  });
  themeModeForm.addEventListener("change", async () => {
    const themeMode = getSelectedWorkspaceThemeMode(themeModeForm);
    applyWorkspaceTheme(themeMode, colorSchemeQuery.matches);
    await saveWorkspaceThemeMode(themeMode);
    renderController.renderCurrentInput();
  });
  layoutModeForm.addEventListener("change", async () => {
    const layoutMode = normalizeLayoutMode(layoutModeForm.layoutMode.value);
    explicitLayoutMode = layoutMode;
    applyWorkspaceLayoutMode(workspaceShell, layoutMode);
    splitLayout.updateOrientation();
    await saveWorkspaceLayoutMode(layoutMode);
    window.requestAnimationFrame(() => splitLayout.clampRestoredSize());
  });
  colorSchemeQuery.addEventListener("change", () => {
    if (getSelectedWorkspaceThemeMode(themeModeForm) === "auto") {
      applyWorkspaceTheme("auto", colorSchemeQuery.matches);
      renderController.renderCurrentInput();
    }
  });

  const infoButton = document.getElementById("infoButton") as HTMLButtonElement;
  const infoDialog = document.getElementById("infoDialog") as HTMLDialogElement;
  const closeInfoButton = document.getElementById(
    "closeInfoButton",
  ) as HTMLButtonElement;

  infoButton.addEventListener("click", () => {
    infoDialog.showModal();
  });

  closeInfoButton.addEventListener("click", () => {
    infoDialog.close();
  });

  infoDialog.addEventListener("click", (event) => {
    const dialogDimensions = infoDialog.getBoundingClientRect();
    if (
      event.clientX < dialogDimensions.left ||
      event.clientX > dialogDimensions.right ||
      event.clientY < dialogDimensions.top ||
      event.clientY > dialogDimensions.bottom
    ) {
      infoDialog.close();
    }
  });

  stackedLayoutQuery.addEventListener("change", () => {
    if (explicitLayoutMode === "auto") {
      splitLayout.updateOrientation();
      window.requestAnimationFrame(() => splitLayout.clampRestoredSize());
    }
  });
  workspaceResizer.addEventListener("pointerdown", splitLayout.startResize);
  workspaceResizer.addEventListener("keydown", splitLayout.handleKeydown);
  window.addEventListener("pointermove", splitLayout.resizeFromPointer);
  window.addEventListener("pointerup", splitLayout.stopResize);

  updateSourceStats();
  renderController.renderCurrentInput();
}

async function updateAbcAutoCheckSetting(
  abcAutoCheck: AbcAutoCheck,
): Promise<void> {
  currentAbcAutoCheck = abcAutoCheck;
  autoCheckInput.checked = abcAutoCheck === "enabled";
  await saveWorkspaceAbcAutoCheck(abcAutoCheck);
  checkCurrentAbcSource();
}

async function updateEditorWrapSetting(editorWrap: EditorWrap): Promise<void> {
  applyEditorWrap(editorWrap);
  await saveWorkspaceEditorWrap(editorWrap);
}

function applyEditorWrap(editorWrap: EditorWrap): void {
  currentEditorWrap = applyWorkspaceEditorWrap(
    editorFrame,
    input,
    editorWrap,
    syncSourceHighlightScroll,
  );
  editorWrapInput.checked = currentEditorWrap === "enabled";
}

function readAbcFromUrlHash(): string | null {
  const abcText = decodeWorkspaceAbcHash(window.location.hash);
  if (abcText === null) return null;

  window.history.replaceState(null, "", window.location.pathname);
  return abcText;
}

function setInputValue(value: string): void {
  input.value = value;
  clearSourceHighlight();
  window.localStorage.setItem(WORKSPACE_SOURCE_STORAGE_KEY, value);
  updateSourceStats();
}

function clearSourceHighlight(): void {
  updateSourceHighlight([]);
}

function updateSourceHighlight(ranges: SourceHighlightRange[]): void {
  const normalizedRanges = normalizeSourceHighlightRanges(
    ranges,
    input.value.length,
  );
  const nextKey = normalizedRanges
    .map((range) => `${range.start}:${range.end}`)
    .join(";");
  if (nextKey === currentSourceHighlightKey) {
    syncSourceHighlightScroll();
    return;
  }

  currentSourceHighlightKey = nextKey;
  sourceHighlightMirror.hidden = normalizedRanges.length === 0;
  if (normalizedRanges.length === 0) {
    sourceHighlightMirror.replaceChildren();
    return;
  }

  sourceHighlightMirror.replaceChildren(
    createSourceHighlightFragment(input.value, normalizedRanges),
  );
  syncSourceHighlightScroll();
}

function syncSourceHighlightScroll(): void {
  sourceHighlightMirror.scrollTop = input.scrollTop;
  sourceHighlightMirror.scrollLeft = input.scrollLeft;
}

function updateSourceStats(): void {
  updateWorkspaceSourceStats(
    { copySourceButton, exportAbcButton, sourceStats },
    input.value,
  );
}

function checkCurrentAbcSource(): void {
  checkWorkspaceAbcSource(
    input.value,
    renderStatus,
    qualityPanel,
    isAutoCheckEnabled(),
  );
}

function runAutoCheck(): void {
  checkCurrentAbcSource();
}

function isAutoCheckEnabled(): boolean {
  return currentAbcAutoCheck === "enabled";
}

async function copySourceToClipboard(): Promise<void> {
  await copyWorkspaceSourceToClipboard(
    input.value,
    sourceStats,
    updateSourceStats,
  );
}

async function importSelectedAbcFile(): Promise<void> {
  await importWorkspaceAbcFile({
    abcFileInput,
    importAbcButton,
    qualityPanel,
    renderCurrentInput: renderController.renderCurrentInput,
    renderStatus,
    setInputValue,
  });
}

function exportCurrentAbcFile(): void {
  exportWorkspaceAbcFile(input.value, sourceStats, updateSourceStats);
}
