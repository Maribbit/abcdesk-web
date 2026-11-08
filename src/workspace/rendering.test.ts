import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererMocks = vi.hoisted(() => ({
  playFromSourceOffset: vi.fn(() => true),
  removeRender: vi.fn(),
  renderAbc: vi.fn(),
}));

vi.mock("../player/renderer", () => ({
  playFromSourceOffset: rendererMocks.playFromSourceOffset,
  removeRender: rendererMocks.removeRender,
  renderAbc: rendererMocks.renderAbc,
}));

import { createWorkspaceRenderController } from "./rendering";

function createController() {
  let sourceText = "";
  const renderMount = document.createElement("section");
  const renderStatus = document.createElement("span");
  const sourceElement = document.createElement("pre");
  const clearSourceHighlight = vi.fn();
  const runAutoCheck = vi.fn();
  const updateSourceHighlight = vi.fn();
  const revealSourceRange = vi.fn();

  const controller = createWorkspaceRenderController({
    clearSourceHighlight,
    getKeyboardVisibility: () => "visible",
    getSourceText: () => sourceText,
    getThemeMode: () => "dark",
    renderDelayMs: 10,
    renderMount,
    renderStatus,
    revealSourceRange,
    runAutoCheck,
    sourceElement,
    updateSourceHighlight,
  });

  return {
    clearSourceHighlight,
    controller,
    renderMount,
    renderStatus,
    revealSourceRange,
    runAutoCheck,
    setSourceText: (text: string) => {
      sourceText = text;
    },
    sourceElement,
    updateSourceHighlight,
  };
}

describe("Workspace render controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendererMocks.renderAbc.mockReturnValue({
      container: document.createElement("article"),
    });
  });

  it("clears renders and status for empty input", () => {
    const {
      clearSourceHighlight,
      controller,
      renderMount,
      renderStatus,
      sourceElement,
    } = createController();
    renderMount.classList.add("has-render");

    controller.renderCurrentInput();

    expect(clearSourceHighlight).toHaveBeenCalledTimes(1);
    expect(rendererMocks.removeRender).toHaveBeenCalledWith(sourceElement);
    expect(renderMount.classList.contains("has-render")).toBe(false);
    expect(renderStatus.textContent).toBe("Ready");
  });

  it("renders trimmed ABC and offsets playback highlight ranges", () => {
    const {
      controller,
      renderMount,
      renderStatus,
      runAutoCheck,
      setSourceText,
      sourceElement,
      updateSourceHighlight,
    } = createController();
    setSourceText("\n  X:1\nK:C\nC|  ");

    controller.renderCurrentInput();

    expect(rendererMocks.renderAbc).toHaveBeenCalledWith(
      sourceElement,
      "X:1\nK:C\nC|",
      "dark",
      "collapsed",
      "visible",
      expect.objectContaining({ onSourceHighlight: expect.any(Function) }),
    );
    const options = rendererMocks.renderAbc.mock.calls[0]?.[5];
    options.onSourceHighlight([{ start: 0, end: 3 }]);

    expect(updateSourceHighlight).toHaveBeenCalledWith([{ start: 3, end: 6 }]);
    expect(renderMount.classList.contains("has-render")).toBe(true);
    expect(renderStatus.textContent).toBe("Rendered");
    expect(runAutoCheck).toHaveBeenCalledTimes(1);
  });

  it("offsets the range named by a score click", () => {
    const { controller, revealSourceRange, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();
    const options = rendererMocks.renderAbc.mock.calls[0]?.[5];
    options.onSelectSourceRange({ start: 8, end: 9 });

    expect(revealSourceRange).toHaveBeenCalledWith({ start: 11, end: 12 });
  });

  it("plays from a caret offset measured in the untrimmed source", () => {
    const { controller, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();

    expect(controller.playFromSourcePosition(11)).toBe(true);
    expect(rendererMocks.playFromSourceOffset).toHaveBeenCalledWith(
      expect.anything(),
      8,
    );
  });

  it("does not play before anything is rendered", () => {
    const { controller } = createController();

    expect(controller.playFromSourcePosition(5)).toBe(false);
    expect(rendererMocks.playFromSourceOffset).not.toHaveBeenCalled();
  });
});
