import {
  normalizeLayoutMode,
  type AbcAutoCheck,
  type EditorWrap,
  type KeyboardVisibility,
  type LayoutMode,
} from "../shared/settings";
import { decodeWorkspaceAbcHash } from "../shared/workspace-url";
import { createCodeMirrorEditor } from "./editor/codemirror-editor";
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
  openWorkspaceAbcFile,
  updateWorkspaceSourceStats,
} from "./source-actions";
import { createSourceDropTarget } from "./source-drop";
import {
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
% A % sign comments out the rest of its line
C D E F | G A B c | c B A G | F E D C |  % after the music, too
% A number doubles the length: E2 is a half, C4 a whole
E2 D2 | C4 |]`;

const editorHost = document.getElementById("abcEditorFrame") as HTMLElement;
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

// The button and the key binding are one intent. The button now lives in the
// transport, next to play; the shortcut stays here because the caret is here.

let currentKeyboardVisibility: KeyboardVisibility = "visible";
let currentAbcAutoCheck: AbcAutoCheck = "enabled";
let currentEditorWrap: EditorWrap = "disabled";
let explicitLayoutMode: LayoutMode = "auto";
let isStartingPlayback = false;

// The editor is a seam: the workspace never touches its DOM, so the
// implementation can be swapped without the rest of the app noticing.
const editor = createCodeMirrorEditor({
  host: editorHost,
  value: "",
  lineWrap: "disabled",
  label: "ABC source code",
  onChange: handleSourceChange,
  onCursorChange: (offset) => {
    renderController.pointSourcePosition(offset);
  },
  onPlayFromCursor: () => {
    void playFromCursor();
  },
});

const splitLayout = createWorkspaceSplitLayout({
  editorPane,
  resizer: workspaceResizer,
  stackedLayoutQuery,
  workspaceShell,
  getLayoutMode: () => explicitLayoutMode,
});
const renderController = createWorkspaceRenderController({
  clearQualityReport: () => {
    hideQualityPanel(qualityPanel);
    editor.setDiagnostics([]);
  },
  clearSourceHighlight: () => editor.setPlaybackHighlight([]),
  getCursorOffset: () => editor.getCursorOffset(),
  getKeyboardVisibility: () => currentKeyboardVisibility,
  getSourceText: () => editor.getValue(),
  getThemeMode: () => getSelectedWorkspaceThemeMode(themeModeForm),
  placeSourceCaret: (offset) => editor.placeCaret(offset),
  renderDelayMs: RENDER_DEBOUNCE_MS,
  renderMount,
  renderStatus,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight: (ranges) => editor.setPlaybackHighlight(ranges),
  updateTargetRanges: (ranges) => editor.setTargetRanges(ranges),
});

void initializeWorkspace();

async function initializeWorkspace(): Promise<void> {
  splitLayout.restoreSizes();
  splitLayout.updateOrientation();
  window.requestAnimationFrame(() => splitLayout.clampRestoredSize());

  editor.setValue(
    readAbcFromUrlHash() ??
      window.localStorage.getItem(WORKSPACE_SOURCE_STORAGE_KEY) ??
      EXAMPLE_ABC,
  );
  window.localStorage.setItem(
    WORKSPACE_SOURCE_STORAGE_KEY,
    editor.getValue(),
  );

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
  createSourceDropTarget({
    pane: editorPane,
    openFile: (file) => {
      void openAbcFile(file);
    },
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
    editor.focus();
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
  currentEditorWrap = editor.setLineWrap(editorWrap);
  editorWrapInput.checked = currentEditorWrap === "enabled";
}

function readAbcFromUrlHash(): string | null {
  const abcText = decodeWorkspaceAbcHash(window.location.hash);
  if (abcText === null) return null;

  window.history.replaceState(null, "", window.location.pathname);
  return abcText;
}

function setInputValue(value: string): void {
  editor.setValue(value);
  window.localStorage.setItem(WORKSPACE_SOURCE_STORAGE_KEY, value);
  updateSourceStats();
}

function handleSourceChange(): void {
  // One read of the document for the three things that need it: on a long tune
  // each read is a copy of the whole text.
  const sourceText = editor.getValue();
  updateSourceStats(sourceText);
  window.localStorage.setItem(WORKSPACE_SOURCE_STORAGE_KEY, sourceText);
  // The last report stays up while the next one is being computed: its marks
  // ride the edit, and the pane does not resize under the caret twice a
  // keystroke. "Editing..." is the honest label for that gap — it is a report
  // about the text as it was. An empty sheet is cleared by the render, which
  // knows no check is coming.
  renderController.scheduleRender();
}

function updateSourceStats(sourceText = editor.getValue()): void {
  updateWorkspaceSourceStats(
    { copySourceButton, exportAbcButton, sourceStats },
    sourceText,
  );
}

async function playFromCursor(): Promise<void> {
  // `play` is a toggle that only flips after the audio context resumes, so a
  // second press in that window would land on "still stopped" and flip it back
  // to paused. One request at a time; repeats from a held key are dropped.
  if (isStartingPlayback) return;
  isStartingPlayback = true;
  try {
    if (await renderController.playFromSourcePosition(editor.getCursorOffset()))
      return;
    renderStatus.textContent = "Nothing to play here";
  } finally {
    isStartingPlayback = false;
  }
}

function checkCurrentAbcSource(): void {
  const report = checkWorkspaceAbcSource(
    editor.getValue(),
    renderStatus,
    qualityPanel,
    isAutoCheckEnabled(),
    (diagnostic) => editor.revealDiagnostic(diagnostic),
  );
  const showsDiagnostics = isAutoCheckEnabled() && report.status !== "ok";
  editor.setDiagnostics(showsDiagnostics ? report.diagnostics : []);
}

function runAutoCheck(): void {
  checkCurrentAbcSource();
}

function isAutoCheckEnabled(): boolean {
  return currentAbcAutoCheck === "enabled";
}

async function copySourceToClipboard(): Promise<void> {
  await copyWorkspaceSourceToClipboard(
    editor.getValue(),
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

async function openAbcFile(file: File): Promise<void> {
  await openWorkspaceAbcFile({
    file,
    importAbcButton,
    qualityPanel,
    renderCurrentInput: renderController.renderCurrentInput,
    renderStatus,
    setInputValue,
  });
}

function exportCurrentAbcFile(): void {
  exportWorkspaceAbcFile(editor.getValue(), sourceStats, updateSourceStats);
}
