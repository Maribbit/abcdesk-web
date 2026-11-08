import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererMocks = vi.hoisted(() => ({
  playFromSourceOffset: vi.fn(() => true),
  removeRender: vi.fn(),
  renderAbc: vi.fn(),
  revealSourceOffset: vi.fn(() => true),
}));

vi.mock("../player/renderer", () => ({
  playFromSourceOffset: rendererMocks.playFromSourceOffset,
  removeRender: rendererMocks.removeRender,
  renderAbc: rendererMocks.renderAbc,
  revealSourceOffset: rendererMocks.revealSourceOffset,
}));

import { createWorkspaceRenderController } from "./rendering";

function createController() {
  let sourceText = "";
  let cursorOffset = 0;
  const renderMount = document.createElement("section");
  const renderStatus = document.createElement("span");
  const sourceElement = document.createElement("pre");
  const clearSourceHighlight = vi.fn();
  const runAutoCheck = vi.fn();
  const updateSourceHighlight = vi.fn();
  const revealSourceRange = vi.fn();

  const controller = createWorkspaceRenderController({
    clearSourceHighlight,
    getCursorOffset: () => cursorOffset,
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
    setCursorOffset: (offset: number) => {
      cursorOffset = offset;
    },
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

  it("reveals a caret measured in the untrimmed source", () => {
    const { controller, setCursorOffset, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();

    expect(controller.revealSourcePosition(11)).toBe(true);
    expect(rendererMocks.revealSourceOffset).toHaveBeenLastCalledWith(
      expect.anything(),
      8,
    );

    // A caret in the indentation before the trimmed text still points at the
    // first note instead of a negative offset.
    setCursorOffset(1);
    controller.renderCurrentInput();
    expect(rendererMocks.revealSourceOffset).toHaveBeenLastCalledWith(
      expect.anything(),
      0,
    );
  });

  it("follows the caret again after a render replaces the score", () => {
    const { controller, setCursorOffset, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");
    controller.renderCurrentInput();
    rendererMocks.revealSourceOffset.mockClear();

    setCursorOffset(13);
    controller.renderCurrentInput();

    expect(rendererMocks.revealSourceOffset).toHaveBeenCalledWith(
      expect.anything(),
      10,
    );
  });

  it("does not reveal before anything is rendered", () => {
    const { controller } = createController();

    expect(controller.revealSourcePosition(5)).toBe(false);
    expect(rendererMocks.revealSourceOffset).not.toHaveBeenCalled();
  });
});
