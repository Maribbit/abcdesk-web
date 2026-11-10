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

  it("keeps the syntax greys right while the text changes under them", () => {
    const { host, view } = createEditor();
    const count = (selector: string) => host.querySelectorAll(selector).length;

    expect(count(".abc-syn-field")).toBe(3);

    // A comment is a different kind of line, and the cache has to rescan it.
    view.dispatch({ changes: { from: 0, insert: "%" } });
    expect(count(".abc-syn-comment")).toBe(1);
    expect(count(".abc-syn-field")).toBe(2);

    view.dispatch({ changes: { from: 0, to: 1 } });
    expect(count(".abc-syn-comment")).toBe(0);
    expect(count(".abc-syn-field")).toBe(3);

    // A line inserted in the middle is scanned on its own, not inherited from
    // the line it split.
    const secondLine = view.state.doc.line(2).from;
    view.dispatch({ changes: { from: secondLine, insert: "T: Inserted\n" } });
    expect(view.state.doc.line(2).text).toBe("T: Inserted");
    expect(count(".abc-syn-field")).toBe(4);

    // Removing it again takes its span with it.
    view.dispatch({
      changes: {
        from: secondLine,
        to: view.state.doc.line(2).to + 1,
      },
    });
    expect(count(".abc-syn-field")).toBe(3);
  });

  it("survives edits that add, join and delete lines", () => {
    const { view } = createEditor();
    const edits = [
      { from: 0, insert: "T: Top\n" },
      { from: 12, to: 14 },
      { from: 4, insert: "\n\n" },
      { from: 0, to: 6 },
      { from: view.state.doc.length, insert: "\nC |" },
    ];

    for (const edit of edits) {
      // Clamp against the document, since earlier edits move the offsets.
      const from = Math.min(edit.from, view.state.doc.length);
      const to = Math.min(edit.to ?? from, view.state.doc.length);
      view.dispatch({ changes: { from, to, insert: edit.insert } });
    }

    expect(view.state.doc.toString()).toContain("C |");
  });

  it("numbers the lines in the margin", () => {
    const { host } = createEditor();

    const margin = host.querySelector(".cm-lineNumbers");
    expect(margin).not.toBeNull();
    // The gutter opens with a measuring spacer (a lone `9`), so the numbers are
    // the elements after it, and the first line is 1.
    const numbers = [...(margin?.querySelectorAll(".cm-gutterElement") ?? [])].map(
      (element) => element.textContent,
    );
    expect(numbers).toContain("1");
  });

  it("marks the line the caret is on, and only that line", () => {
    const { host, view } = createEditor();

    expect(host.querySelectorAll(".cm-activeLine")).toHaveLength(1);
    expect(host.querySelectorAll(".cm-activeLineGutter")).toHaveLength(1);

    view.dispatch({ selection: { anchor: SOURCE.length } });
    expect(host.querySelectorAll(".cm-activeLine")).toHaveLength(1);
    expect(host.querySelectorAll(".cm-activeLineGutter")).toHaveLength(1);
  });

  it("dots the margin of every line a diagnostic names", () => {
    const { editor, host, view } = createEditor();
    const diagnostic = {
      severity: "warning" as const,
      source: "abcjs" as const,
      title: "abcjs parser warning",
      message: "Music Line:2:1: unexpected symbol",
      line: 2,
      column: 1,
    };

    // Two diagnostics on one line are one line: the margin points, it does not
    // count.
    editor.setDiagnostics([
      diagnostic,
      { ...diagnostic, line: 2, column: 7 },
    ]);
    expect(host.querySelectorAll(".abc-diagnostic-gutter")).toHaveLength(1);
    expect(host.querySelector(".abc-diagnostic-gutter")?.textContent).toBe("2");

    // A line written above carries the dot down with its line instead of
    // blinking it out: the check that will replace it is already on its way.
    view.dispatch({ changes: { from: 0, insert: "%\n" } });
    expect(host.querySelectorAll(".abc-diagnostic-gutter")).toHaveLength(1);
    expect(host.querySelector(".abc-diagnostic-gutter")?.textContent).toBe("3");
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

  it("keeps an underline on its text across an edit, and drops it on the next check", () => {
    const { editor, host, view } = createEditor();
    const diagnostic = {
      severity: "warning" as const,
      source: "abcjs" as const,
      title: "abcjs parser warning",
      message: "Music Line:1:1: unexpected symbol",
      line: 1,
      column: 1,
    };

    editor.setDiagnostics([diagnostic]);
    expect(host.querySelector(".abc-diagnostic-token")?.textContent).toBe("X: 1");

    view.dispatch({ changes: { from: 0, insert: "%\n" } });

    expect(host.querySelector(".abc-diagnostic-token")?.textContent).toBe("X: 1");

    editor.setDiagnostics([]);
    expect(host.querySelectorAll(".abc-diagnostic-token")).toHaveLength(0);
    expect(host.querySelectorAll(".abc-diagnostic-gutter")).toHaveLength(0);
  });

  it("moves focus into the editing surface", () => {
    const { editor, host } = createEditor();

    editor.focus();

    expect(host.contains(document.activeElement)).toBe(true);
  });

  it("outlines the note the two panes point at", () => {
    const { editor, host, view } = createEditor();

    editor.setTargetRanges([{ start: 18, end: 22 }]);
    expect(host.querySelectorAll(".abc-target-token")).toHaveLength(1);

    // The outline is drawn, not selected: the caret stays where the user left it.
    expect(view.state.selection.main.head).toBe(0);

    // Text moves under the mark, so the offsets no longer mean the same notes.
    view.dispatch({ changes: { from: 0, insert: "%\n" } });
    expect(host.querySelectorAll(".abc-target-token")).toHaveLength(0);
  });

  it("lifts the target outline on request", () => {
    const { editor, host } = createEditor();

    editor.setTargetRanges([{ start: 18, end: 22 }]);
    editor.setTargetRanges([]);

    expect(host.querySelectorAll(".abc-target-token")).toHaveLength(0);
  });

  it("puts a caret without taking focus", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const { editor, onChange, view } = createEditor();

    editor.placeCaret(18);

    // Collapsed: the outline names the note, so the caret must not.
    expect(view.state.selection.main.head).toBe(18);
    expect(view.state.selection.main.empty).toBe(true);
    expect(document.activeElement).toBe(outside);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps a placed caret to the document", () => {
    const { editor, onChange, view } = createEditor();

    editor.placeCaret(200);

    expect(view.state.selection.main.head).toBe(SOURCE.length);
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

    editor.placeCaret(18);

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

  it("comments the line under the caret, and takes the mark back", () => {
    const { editor, view } = createEditor();

    view.dispatch({ selection: { anchor: 7 } });
    pressModSlash(view);

    expect(editor.getValue()).toBe("X: 1\n% T: Test\nK: C\nCDEF | GABc |");

    pressModSlash(view);

    expect(editor.getValue()).toBe(SOURCE);
  });

  it("comments every line a selection touches", () => {
    const { editor, view } = createEditor();

    // From the middle of line 2 to the middle of line 4.
    view.dispatch({ selection: { anchor: 7, head: 20 } });
    pressModSlash(view);

    expect(editor.getValue()).toBe(
      "X: 1\n% T: Test\n% K: C\n% CDEF | GABc |",
    );

    pressModSlash(view);

    expect(editor.getValue()).toBe(SOURCE);
  });

  it("leaves a line the selection only reaches the start of", () => {
    const { editor, view } = createEditor();

    // Up to, but not into, line 4 — whose first offset is 18.
    view.dispatch({ selection: { anchor: 7, head: 18 } });
    pressModSlash(view);

    expect(editor.getValue()).toBe("X: 1\n% T: Test\n% K: C\nCDEF | GABc |");
  });

  it("skips the blank lines inside a block", () => {
    const { editor, view } = createEditor();

    editor.setValue("one\n\ntwo\n");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    pressModSlash(view);

    expect(editor.getValue()).toBe("% one\n\n% two\n");
  });

  it("uncomments a block that is already all comment, spaces and all", () => {
    const { editor, view } = createEditor();

    editor.setValue("% one\n%two\n");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    pressModSlash(view);

    expect(editor.getValue()).toBe("one\ntwo\n");
  });

  it("comments a block rather than uncommenting one line of it", () => {
    const { editor, view } = createEditor();

    editor.setValue("% one\ntwo\n");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    pressModSlash(view);

    expect(editor.getValue()).toBe("% % one\n% two\n");
  });
});

function pressModSlash(view: EditorView): void {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "/",
    }),
  );
}
