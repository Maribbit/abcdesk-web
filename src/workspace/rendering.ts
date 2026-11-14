import {
  getTuneTitle,
  playFromSourceOffset,
  pointSourceOffset,
  renderAbc,
  removeRender,
  type RenderInstance,
  type SourceHighlightRange,
} from "../player/renderer";
import type { KeyboardVisibility, ThemeMode } from "../shared/settings";
import { offsetSourceHighlightRanges } from "./source-highlight";

interface WorkspaceRenderControllerOptions {
  /** Take down the last report: no check is coming to replace it. */
  clearQualityReport: () => void;
  clearSourceHighlight: () => void;
  getCursorOffset: () => number;
  getKeyboardVisibility: () => KeyboardVisibility;
  getSourceText: () => string;
  getThemeMode: () => ThemeMode;
  placeSourceCaret: (offset: number) => void;
  renderDelayMs: number;
  renderMount: HTMLElement;
  renderStatus: HTMLElement;
  runAutoCheck: () => void;
  sourceElement: HTMLElement;
  updateSourceHighlight: (ranges: SourceHighlightRange[]) => void;
  updateTargetRanges: (ranges: SourceHighlightRange[]) => void;
  /** The tune's `T:`, or null when the sheet has none or does not parse. */
  updateTuneTitle: (title: string | null) => void;
}

export interface WorkspaceRenderController {
  getCurrentInstance: () => RenderInstance | null;
  /** Play the note at a raw (untrimmed) source offset; false if silent. */
  playFromSourcePosition: (offset: number) => Promise<boolean>;
  /** Point both panes at the note at a raw source offset; false if none. */
  pointSourcePosition: (offset: number) => boolean;
  renderCurrentInput: () => void;
  scheduleRender: () => void;
}

export function createWorkspaceRenderController({
  clearQualityReport,
  clearSourceHighlight,
  getCursorOffset,
  getKeyboardVisibility,
  getSourceText,
  getThemeMode,
  placeSourceCaret,
  renderDelayMs,
  renderMount,
  renderStatus,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight,
  updateTargetRanges,
  updateTuneTitle,
}: WorkspaceRenderControllerOptions): WorkspaceRenderController {
  let renderTimer: number | undefined;
  let currentInstance: RenderInstance | null = null;
  let sourceOffset = 0;

  const pointSourcePosition = (offset: number): boolean => {
    if (!currentInstance) return false;
    return pointSourceOffset(
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
    updateTargetRanges([]);
    sourceElement.textContent = abcText;

    if (!abcText) {
      removeRender(sourceElement);
      currentInstance = null;
      renderMount.classList.remove("has-render");
      // No check follows an empty sheet, so the last report has to die with the
      // text it was about: nothing else will come along to replace it.
      clearQualityReport();
      renderStatus.textContent = "Ready";
      updateTuneTitle(null);
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
          onTargetRanges: (ranges) => {
            updateTargetRanges(offsetSourceHighlightRanges(ranges, sourceOffset));
          },
          onSelectSourceRange: (range) => {
            placeSourceCaret(range.start + sourceOffset);
          },
        },
      );
      currentInstance.container.dataset.abcdeskLayout = "workspace";
      renderMount.classList.add("has-render");
      renderStatus.textContent = "Rendered";
      // The tab names the tune that actually reached the paper, not the text
      // still being typed a debounce away from it.
      updateTuneTitle(getTuneTitle(currentInstance));
      // A fresh score starts at its own top: point at the caret again so the
      // new layout marks the note being read or written.
      pointSourcePosition(getCursorOffset());
      runAutoCheck();
    } catch (error) {
      console.error("[ABC Desk Web] Render failed:", error);
      renderStatus.textContent = "Render failed";
      // Nothing on the paper to name: the app keeps its own title.
      updateTuneTitle(null);
    }
  };

  const scheduleRender = () => {
    if (renderTimer !== undefined) window.clearTimeout(renderTimer);
    renderStatus.textContent = "Editing...";
    renderTimer = window.setTimeout(renderCurrentInput, renderDelayMs);
  };

  return {
    getCurrentInstance: () => currentInstance,
    playFromSourcePosition: async (offset) => {
      // An edit is still waiting for the debounce: playing the score the user
      // typed is the point, so land it now rather than mapping the caret onto
      // a text that no longer exists.
      if (renderTimer !== undefined) renderCurrentInput();
      if (!currentInstance) return false;
      return playFromSourceOffset(
        currentInstance,
        Math.max(offset - sourceOffset, 0),
      );
    },
    pointSourcePosition,
    renderCurrentInput,
    scheduleRender,
  };
}
