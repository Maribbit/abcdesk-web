import {
  playFromSourceOffset,
  renderAbc,
  removeRender,
  revealSourceOffset,
  type RenderInstance,
  type SourceHighlightRange,
} from "../player/renderer";
import type { KeyboardVisibility, ThemeMode } from "../shared/settings";
import {
  offsetSourceHighlightRange,
  offsetSourceHighlightRanges,
} from "./source-highlight";

interface WorkspaceRenderControllerOptions {
  clearSourceHighlight: () => void;
  getCursorOffset: () => number;
  getKeyboardVisibility: () => KeyboardVisibility;
  getSourceText: () => string;
  getThemeMode: () => ThemeMode;
  renderDelayMs: number;
  renderMount: HTMLElement;
  renderStatus: HTMLElement;
  revealSourceRange: (range: SourceHighlightRange) => void;
  runAutoCheck: () => void;
  sourceElement: HTMLElement;
  updateSourceHighlight: (ranges: SourceHighlightRange[]) => void;
}

export interface WorkspaceRenderController {
  getCurrentInstance: () => RenderInstance | null;
  /** Play the note under a raw (untrimmed) source offset; false if silent. */
  playFromSourcePosition: (offset: number) => boolean;
  renderCurrentInput: () => void;
  /** Scroll the note under a raw source offset into view; false if silent. */
  revealSourcePosition: (offset: number) => boolean;
  scheduleRender: () => void;
}

export function createWorkspaceRenderController({
  clearSourceHighlight,
  getCursorOffset,
  getKeyboardVisibility,
  getSourceText,
  getThemeMode,
  renderDelayMs,
  renderMount,
  renderStatus,
  revealSourceRange,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight,
}: WorkspaceRenderControllerOptions): WorkspaceRenderController {
  let renderTimer: number | undefined;
  let currentInstance: RenderInstance | null = null;
  let sourceOffset = 0;

  const revealSourcePosition = (offset: number): boolean => {
    if (!currentInstance) return false;
    return revealSourceOffset(
      currentInstance,
      Math.max(offset - sourceOffset, 0),
    );
  };

  const renderCurrentInput = () => {
    if (renderTimer !== undefined) {
      window.clearTimeout(renderTimer);
      renderTimer = undefined;
    }

    const rawText = getSourceText();
    const abcText = rawText.trim();
    sourceOffset = abcText ? rawText.indexOf(abcText) : 0;
    clearSourceHighlight();
    sourceElement.textContent = abcText;

    if (!abcText) {
      removeRender(sourceElement);
      currentInstance = null;
      renderMount.classList.remove("has-render");
      renderStatus.textContent = "Ready";
      return;
    }

    try {
      currentInstance = renderAbc(
        sourceElement,
        abcText,
        getThemeMode(),
        "collapsed",
        getKeyboardVisibility(),
        {
          onSourceHighlight: (ranges) => {
            updateSourceHighlight(
              offsetSourceHighlightRanges(ranges, sourceOffset),
            );
          },
          onSelectSourceRange: (range) => {
            revealSourceRange(offsetSourceHighlightRange(range, sourceOffset));
          },
        },
      );
      currentInstance.container.dataset.abcdeskLayout = "workspace";
      renderMount.classList.add("has-render");
      renderStatus.textContent = "Rendered";
      // A fresh score starts at its own top: after an edit, follow the caret
      // again so the new layout still shows the note being written.
      revealSourcePosition(getCursorOffset());
      runAutoCheck();
    } catch (error) {
      console.error("[ABC Desk Web] Render failed:", error);
      renderStatus.textContent = "Render failed";
    }
  };

  const scheduleRender = () => {
    if (renderTimer !== undefined) window.clearTimeout(renderTimer);
    renderStatus.textContent = "Editing...";
    renderTimer = window.setTimeout(renderCurrentInput, renderDelayMs);
  };

  return {
    getCurrentInstance: () => currentInstance,
    playFromSourcePosition: (offset) => {
      if (!currentInstance) return false;
      return playFromSourceOffset(
        currentInstance,
        Math.max(offset - sourceOffset, 0),
      );
    },
    renderCurrentInput,
    revealSourcePosition,
    scheduleRender,
  };
}
