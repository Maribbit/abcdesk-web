import type { LayoutMode } from "../shared/settings";

const WORKSPACE_DESKTOP_SPLIT_STORAGE_KEY = "abcdeskWorkspaceDesktopSplit";
const WORKSPACE_MOBILE_SPLIT_STORAGE_KEY = "abcdeskWorkspaceMobileSplit";
const MIN_DESKTOP_EDITOR_WIDTH = 280;
const MIN_DESKTOP_PREVIEW_WIDTH = 320;
const MIN_MOBILE_EDITOR_HEIGHT = 160;
const MIN_MOBILE_PREVIEW_HEIGHT = 220;
const SPLIT_KEYBOARD_STEP = 24;

interface WorkspaceSplitLayoutOptions {
  editorPane: HTMLElement;
  resizer: HTMLElement;
  stackedLayoutQuery: Pick<MediaQueryList, "matches">;
  workspaceShell: HTMLElement;
  getLayoutMode: () => LayoutMode;
}

export interface WorkspaceSplitLayout {
  clampRestoredSize: () => void;
  handleKeydown: (event: KeyboardEvent) => void;
  restoreSizes: () => void;
  resizeFromPointer: (event: PointerEvent) => void;
  startResize: (event: PointerEvent) => void;
  stopResize: () => void;
  updateOrientation: () => void;
}

export function createWorkspaceSplitLayout({
  editorPane,
  resizer,
  stackedLayoutQuery,
  workspaceShell,
  getLayoutMode,
}: WorkspaceSplitLayoutOptions): WorkspaceSplitLayout {
  let isResizing = false;

  const isStackedLayout = () => {
    const layoutMode = getLayoutMode();
    if (layoutMode === "vertical") return true;
    if (layoutMode === "horizontal") return false;
    return stackedLayoutQuery.matches;
  };

  const setDesktopEditorWidth = (width: number) => {
    const maxWidth =
      workspaceShell.getBoundingClientRect().width - MIN_DESKTOP_PREVIEW_WIDTH;
    const editorWidth = clamp(width, MIN_DESKTOP_EDITOR_WIDTH, maxWidth);
    const value = `${editorWidth}px`;

    workspaceShell.style.setProperty("--workspace-editor-size", value);
    window.localStorage.setItem(WORKSPACE_DESKTOP_SPLIT_STORAGE_KEY, value);
  };

  const setMobileEditorHeight = (height: number) => {
    const maxHeight =
      workspaceShell.getBoundingClientRect().height -
      MIN_MOBILE_PREVIEW_HEIGHT -
      resizer.getBoundingClientRect().height;
    const editorHeight = clamp(height, MIN_MOBILE_EDITOR_HEIGHT, maxHeight);
    const value = `${editorHeight}px`;

    workspaceShell.style.setProperty("--workspace-editor-mobile-size", value);
    window.localStorage.setItem(WORKSPACE_MOBILE_SPLIT_STORAGE_KEY, value);
  };

  const restoreSizes = () => {
    const desktopSplit = window.localStorage.getItem(
      WORKSPACE_DESKTOP_SPLIT_STORAGE_KEY,
    );
    const mobileSplit = window.localStorage.getItem(
      WORKSPACE_MOBILE_SPLIT_STORAGE_KEY,
    );

    if (desktopSplit) {
      workspaceShell.style.setProperty("--workspace-editor-size", desktopSplit);
    }
    if (mobileSplit) {
      workspaceShell.style.setProperty("--workspace-editor-mobile-size", mobileSplit);
    }
  };

  const updateOrientation = () => {
    resizer.setAttribute(
      "aria-orientation",
      isStackedLayout() ? "horizontal" : "vertical",
    );
  };

  const clampRestoredSize = () => {
    if (isStackedLayout()) {
      setMobileEditorHeight(editorPane.getBoundingClientRect().height);
    }
  };

  const startResize = (event: PointerEvent) => {
    isResizing = true;
    workspaceShell.classList.add("is-resizing");
    resizer.setPointerCapture(event.pointerId);
  };

  const resizeFromPointer = (event: PointerEvent) => {
    if (!isResizing) return;

    if (isStackedLayout()) {
      setMobileEditorHeight(
        event.clientY - editorPane.getBoundingClientRect().top,
      );
    } else {
      setDesktopEditorWidth(
        event.clientX - workspaceShell.getBoundingClientRect().left,
      );
    }
  };

  const stopResize = () => {
    if (!isResizing) return;
    isResizing = false;
    workspaceShell.classList.remove("is-resizing");
  };

  const handleKeydown = (event: KeyboardEvent) => {
    const stackedLayout = isStackedLayout();
    const delta = getResizeDelta(event, stackedLayout);
    if (delta === 0) return;

    event.preventDefault();
    if (stackedLayout) {
      setMobileEditorHeight(editorPane.getBoundingClientRect().height + delta);
    } else {
      setDesktopEditorWidth(editorPane.getBoundingClientRect().width + delta);
    }
  };

  return {
    clampRestoredSize,
    handleKeydown,
    restoreSizes,
    resizeFromPointer,
    startResize,
    stopResize,
    updateOrientation,
  };
}

function getResizeDelta(event: KeyboardEvent, stackedLayout: boolean): number {
  if (stackedLayout) {
    if (event.key === "ArrowUp") return -SPLIT_KEYBOARD_STEP;
    if (event.key === "ArrowDown") return SPLIT_KEYBOARD_STEP;
    return 0;
  }

  if (event.key === "ArrowLeft") return -SPLIT_KEYBOARD_STEP;
  if (event.key === "ArrowRight") return SPLIT_KEYBOARD_STEP;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
