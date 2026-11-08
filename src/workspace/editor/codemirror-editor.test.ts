import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import type { EditorWrap } from "../../shared/settings";
import { createCodeMirrorEditor } from "./codemirror-editor";

const SOURCE = "X: 1\nT: Test\nK: C\nCDEF | GABc |";

function createEditor(
  lineWrap: EditorWrap = "disabled",
  onPlayFromCursor?: () => void,
) {
  const host = document.createElement("section");
  document.body.append(host);

  const onChange = vi.fn();
  const onCursorChange = vi.fn();
  const editor = createCodeMirrorEditor({
    host,
    value: SOURCE,
    lineWrap,
    label: "ABC source code",
    onChange,
    onCursorChange,
    onPlayFromCursor,
  });

  const view = EditorView.findFromDOM(host);
  if (!view) throw new Error("EditorView was not mounted into the host");

  return { editor, host, onChange, onCursorChange, view };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("CodeMirror editor", () => {
  it("mounts into the host and reports the document", () => {
    const { editor, host } = createEditor();

    expect(host.querySelector(".cm-editor")).not.toBeNull();
    expect(host.querySelector(".cm-content")?.getAttribute("aria-label")).toBe(
      "ABC source code",
    );
    expect(editor.getValue()).toBe(SOURCE);
  });

  it("reports a user edit once", () => {
    const { editor, onChange, view } = createEditor();

    view.dispatch({
      changes: { from: view.state.doc.length, insert: "D" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(editor.getValue()).toBe(`${SOURCE}D`);
  });

  it("replaces the document without reporting an edit", () => {
    const { editor, onChange } = createEditor();

    editor.setValue("T: Other");

    expect(editor.getValue()).toBe("T: Other");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies and lifts the wrap preference", () => {
    const { editor, host } = createEditor();
    const content = () => host.querySelector(".cm-content");

    expect(editor.setLineWrap("enabled")).toBe("enabled");
    expect(host.dataset.editorWrap).toBe("enabled");
    expect(content()?.classList.contains("cm-lineWrapping")).toBe(true);

    expect(editor.setLineWrap("disabled")).toBe("disabled");
    expect(host.dataset.editorWrap).toBe("disabled");
    expect(content()?.classList.contains("cm-lineWrapping")).toBe(false);
  });

  it("applies the initial wrap preference while mounting", () => {
    const { host, view } = createEditor("enabled");

    expect(host.dataset.editorWrap).toBe("enabled");
    expect(view.lineWrapping).toBe(true);
  });

  it("tints the sounding ranges and drops them when the text moves", () => {
    const { editor, host, view } = createEditor();

    editor.setPlaybackHighlight([{ start: 18, end: 22 }]);
    expect(host.querySelectorAll(".abc-live-token")).toHaveLength(1);

    view.dispatch({ changes: { from: 0, insert: "%\n" } });
    expect(host.querySelectorAll(".abc-live-token")).toHaveLength(0);
  });

  it("paints syntax greys for metadata, comments and bars", () => {
    const { host } = createEditor();

    expect(host.querySelectorAll(".abc-syn-field").length).toBeGreaterThan(0);
    expect(host.querySelectorAll(".abc-syn-bar").length).toBeGreaterThan(0);
  });

  it("underlines a diagnostic and selects its line on reveal", () => {
    const { editor, host, view } = createEditor();
    const diagnostic = {
      severity: "warning" as const,
      source: "abcjs" as const,
      title: "abcjs parser warning",
      message: "Music Line:4:1: unexpected symbol",
      line: 4,
      column: 1,
    };

    editor.setDiagnostics([diagnostic]);
    expect(host.querySelectorAll(".abc-diagnostic-token")).toHaveLength(1);

    editor.revealDiagnostic(diagnostic);
    expect(view.state.selection.main.from).toBe(18);
    expect(view.state.selection.main.to).toBe(31);
  });

  it("moves focus into the editing surface", () => {
    const { editor, host } = createEditor();

    editor.focus();

    expect(host.contains(document.activeElement)).toBe(true);
  });

  it("puts the caret on a range without taking focus", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const { editor, onChange, view } = createEditor();

    editor.revealRange({ start: 18, end: 22 });

    expect(view.state.selection.main.from).toBe(18);
    expect(view.state.selection.main.to).toBe(22);
    expect(document.activeElement).toBe(outside);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps a revealed range to the document", () => {
    const { editor, onChange, view } = createEditor();

    editor.revealRange({ start: 200, end: 240 });

    expect(view.state.selection.main.from).toBe(SOURCE.length);
    expect(view.state.selection.main.to).toBe(SOURCE.length);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports the caret offset", () => {
    const { editor, onChange, view } = createEditor();

    view.dispatch({ selection: { anchor: 12 } });

    expect(editor.getCursorOffset()).toBe(12);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports a caret move but not the edit that moved it", () => {
    const { onChange, onCursorChange, view } = createEditor();

    view.dispatch({ selection: { anchor: 18 } });
    expect(onCursorChange).toHaveBeenLastCalledWith(18);

    view.dispatch({ changes: { from: 0, insert: "%\n" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onCursorChange).toHaveBeenCalledTimes(1);
  });

  it("keeps quiet about a caret the workspace placed", () => {
    const { editor, onCursorChange } = createEditor();

    editor.revealRange({ start: 18, end: 22 });

    expect(onCursorChange).not.toHaveBeenCalled();
  });

  it("turns the play shortcut into an intent, not an edit", () => {
    const onPlayFromCursor = vi.fn();
    const { editor, view } = createEditor("disabled", onPlayFromCursor);

    view.dispatch({ selection: { anchor: 18 } });
    // jsdom reports no platform, so CodeMirror resolves Mod to Ctrl here.
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key: "Enter",
      }),
    );

    expect(onPlayFromCursor).toHaveBeenCalledTimes(1);
    expect(editor.getCursorOffset()).toBe(18);
  });
});
