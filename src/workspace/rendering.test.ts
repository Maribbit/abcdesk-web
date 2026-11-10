import { beforeEach, describe, expect, it, vi } from "vitest";

const rendererMocks = vi.hoisted(() => ({
  playFromSourceOffset: vi.fn(() => true),
  pointSourceOffset: vi.fn(() => true),
  removeRender: vi.fn(),
  renderAbc: vi.fn(),
}));

vi.mock("../player/renderer", () => ({
  playFromSourceOffset: rendererMocks.playFromSourceOffset,
  pointSourceOffset: rendererMocks.pointSourceOffset,
  removeRender: rendererMocks.removeRender,
  renderAbc: rendererMocks.renderAbc,
}));

import { createWorkspaceRenderController } from "./rendering";

function createController() {
  let sourceText = "";
  let cursorOffset = 0;
  const renderMount = document.createElement("section");
  const renderStatus = document.createElement("span");
  const sourceElement = document.createElement("pre");
  const clearQualityReport = vi.fn();
  const clearSourceHighlight = vi.fn();
  const placeSourceCaret = vi.fn();
  const runAutoCheck = vi.fn();
  const updateSourceHighlight = vi.fn();
  const updateTargetRanges = vi.fn();

  const controller = createWorkspaceRenderController({
    clearQualityReport,
    clearSourceHighlight,
    getCursorOffset: () => cursorOffset,
    getKeyboardVisibility: () => "visible",
    getSourceText: () => sourceText,
    getThemeMode: () => "dark",
    placeSourceCaret,
    renderDelayMs: 10,
    renderMount,
    renderStatus,
    runAutoCheck,
    sourceElement,
    updateSourceHighlight,
    updateTargetRanges,
  });

  return {
    clearQualityReport,
    clearSourceHighlight,
    controller,
    placeSourceCaret,
    renderMount,
    renderStatus,
    runAutoCheck,
    setCursorOffset: (offset: number) => {
      cursorOffset = offset;
    },
    setSourceText: (text: string) => {
      sourceText = text;
    },
    sourceElement,
    updateSourceHighlight,
    updateTargetRanges,
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
      clearQualityReport,
      clearSourceHighlight,
      controller,
      renderMount,
      renderStatus,
      runAutoCheck,
      sourceElement,
    } = createController();
    renderMount.classList.add("has-render");

    controller.renderCurrentInput();

    expect(clearSourceHighlight).toHaveBeenCalledTimes(1);
    expect(rendererMocks.removeRender).toHaveBeenCalledWith(sourceElement);
    expect(renderMount.classList.contains("has-render")).toBe(false);
    expect(renderStatus.textContent).toBe("Ready");
    // Nothing will check an empty sheet later, so the last report is taken down
    // here rather than left to outlive the text it was about — and no check is
    // run, since an empty sheet has nothing to report.
    expect(clearQualityReport).toHaveBeenCalledTimes(1);
    expect(runAutoCheck).not.toHaveBeenCalled();
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

  it("moves the caret to the characters a score click names", () => {
    const { controller, placeSourceCaret, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();
    const options = rendererMocks.renderAbc.mock.calls[0]?.[5];
    options.onSelectSourceRange({ start: 8, end: 9 });

    // The range is trimmed source; the editor holds the untrimmed text.
    expect(placeSourceCaret).toHaveBeenCalledWith(11);
  });

  it("offsets the ranges the score marks for the source", () => {
    const { controller, setSourceText, updateTargetRanges } =
      createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();
    // Nothing is marked yet: the old outline must go with the old sheet.
    expect(updateTargetRanges).toHaveBeenCalledWith([]);

    const options = rendererMocks.renderAbc.mock.calls[0]?.[5];
    options.onTargetRanges([{ start: 8, end: 9 }]);

    expect(updateTargetRanges).toHaveBeenLastCalledWith([{ start: 11, end: 12 }]);
  });

  it("plays from a caret offset measured in the untrimmed source", async () => {
    const { controller, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();

    await expect(controller.playFromSourcePosition(11)).resolves.toBe(true);
    expect(rendererMocks.playFromSourceOffset).toHaveBeenCalledWith(
      expect.anything(),
      8,
    );
  });

  it("does not play before anything is rendered", async () => {
    const { controller } = createController();

    await expect(controller.playFromSourcePosition(5)).resolves.toBe(false);
    expect(rendererMocks.playFromSourceOffset).not.toHaveBeenCalled();
  });

  it("renders a waiting edit before playing from the caret", async () => {
    const { controller, setSourceText } = createController();
    setSourceText("X:1\nK:C\nC|");

    // Only scheduled, never rendered: the caret points into a text the score
    // on screen does not know yet.
    controller.scheduleRender();
    await controller.playFromSourcePosition(8);

    expect(rendererMocks.renderAbc).toHaveBeenCalledTimes(1);
    expect(rendererMocks.playFromSourceOffset).toHaveBeenCalledWith(
      expect.anything(),
      8,
    );
  });

  it("points at a caret measured in the untrimmed source", () => {
    const { controller, setCursorOffset, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");

    controller.renderCurrentInput();

    expect(controller.pointSourcePosition(11)).toBe(true);
    expect(rendererMocks.pointSourceOffset).toHaveBeenLastCalledWith(
      expect.anything(),
      8,
    );

    // A caret in the indentation before the trimmed text still points at the
    // first note instead of a negative offset.
    setCursorOffset(1);
    controller.renderCurrentInput();
    expect(rendererMocks.pointSourceOffset).toHaveBeenLastCalledWith(
      expect.anything(),
      0,
    );
  });

  it("follows the caret again after a render replaces the score", () => {
    const { controller, setCursorOffset, setSourceText } = createController();
    setSourceText("\n  X:1\nK:C\nC|");
    controller.renderCurrentInput();
    rendererMocks.pointSourceOffset.mockClear();

    setCursorOffset(13);
    controller.renderCurrentInput();

    expect(rendererMocks.pointSourceOffset).toHaveBeenCalledWith(
      expect.anything(),
      10,
    );
  });

  it("does not point before anything is rendered", () => {
    const { controller } = createController();

    expect(controller.pointSourcePosition(5)).toBe(false);
    expect(rendererMocks.pointSourceOffset).not.toHaveBeenCalled();
  });
});
