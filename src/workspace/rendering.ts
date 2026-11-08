import {
  renderAbc,
  removeRender,
  type RenderInstance,
  type SourceHighlightRange,
} from "../player/renderer";
import type { KeyboardVisibility, ThemeMode } from "../shared/settings";
import { offsetSourceHighlightRanges } from "./source-highlight";

interface WorkspaceRenderControllerOptions {
  clearSourceHighlight: () => void;
  getKeyboardVisibility: () => KeyboardVisibility;
  getSourceText: () => string;
  getThemeMode: () => ThemeMode;
  renderDelayMs: number;
  renderMount: HTMLElement;
  renderStatus: HTMLElement;
  runAutoCheck: () => void;
  sourceElement: HTMLElement;
  updateSourceHighlight: (ranges: SourceHighlightRange[]) => void;
}

export interface WorkspaceRenderController {
  getCurrentInstance: () => RenderInstance | null;
  renderCurrentInput: () => void;
  scheduleRender: () => void;
}

export function createWorkspaceRenderController({
  clearSourceHighlight,
  getKeyboardVisibility,
  getSourceText,
  getThemeMode,
  renderDelayMs,
  renderMount,
  renderStatus,
  runAutoCheck,
  sourceElement,
  updateSourceHighlight,
}: WorkspaceRenderControllerOptions): WorkspaceRenderController {
  let renderTimer: number | undefined;
  let currentInstance: RenderInstance | null = null;

  const renderCurrentInput = () => {
    if (renderTimer !== undefined) {
      window.clearTimeout(renderTimer);
      renderTimer = undefined;
    }

    const rawText = getSourceText();
    const abcText = rawText.trim();
    const sourceOffset = abcText ? rawText.indexOf(abcText) : 0;
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
        },
      );
      currentInstance.container.dataset.abcdeskLayout = "workspace";
      renderMount.classList.add("has-render");
      renderStatus.textContent = "Rendered";
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
    renderCurrentInput,
    scheduleRender,
  };
}
