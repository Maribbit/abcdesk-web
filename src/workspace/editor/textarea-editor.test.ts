import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorWrap } from "../../shared/settings";
import { createTextareaEditor } from "./textarea-editor";

const SOURCE = "X:1\nK:C\nCDEF";

function createEditor(lineWrap: EditorWrap = "disabled") {
  const host = document.createElement("section");
  document.body.append(host);

  const onChange = vi.fn();
  const editor = createTextareaEditor({
    host,
    value: SOURCE,
    lineWrap,
    label: "ABC source code",
    onChange,
  });

  return {
    editor,
    host,
    mirror: host.querySelector(".abc-highlight-mirror") as HTMLElement,
    onChange,
    textarea: host.querySelector("textarea") as HTMLTextAreaElement,
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("Textarea editor", () => {
  it("mounts a labelled textarea and a hidden mirror in the host", () => {
    const { editor, host, mirror, textarea } = createEditor();

    expect(host.children).toHaveLength(2);
    expect(textarea.getAttribute("aria-label")).toBe("ABC source code");
    expect(textarea.spellcheck).toBe(false);
    expect(mirror.getAttribute("aria-hidden")).toBe("true");
    expect(mirror.hidden).toBe(true);
    expect(editor.getValue()).toBe(SOURCE);
  });

  it("reports edits and drops the tint as soon as the text moves", () => {
    const { editor, mirror, onChange, textarea } = createEditor();
    editor.setPlaybackHighlight([{ start: 8, end: 12 }]);
    expect(mirror.hidden).toBe(false);

    textarea.value = "X:1\nK:C\nC";
    textarea.dispatchEvent(new Event("input"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(editor.getValue()).toBe("X:1\nK:C\nC");
    expect(mirror.hidden).toBe(true);
  });

  it("replaces the document without reporting an edit", () => {
    const { editor, onChange } = createEditor();

    editor.setValue("T: Other");

    expect(editor.getValue()).toBe("T: Other");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("paints merged playback ranges and clears them on request", () => {
    const { editor, mirror } = createEditor();

    editor.setPlaybackHighlight([
      { start: 8, end: 10 },
      { start: 9, end: 12 },
    ]);
    const marks = mirror.querySelectorAll("mark.abc-highlight-token");
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe("CDEF");

    editor.setPlaybackHighlight([]);
    expect(mirror.hidden).toBe(true);
    expect(mirror.children).toHaveLength(0);
  });

  it("applies the wrap preference to the host and the textarea", () => {
    const { editor, host, textarea } = createEditor();

    expect(editor.setLineWrap("enabled")).toBe("enabled");
    expect(host.dataset.editorWrap).toBe("enabled");
    expect(textarea.getAttribute("wrap")).toBe("soft");

    expect(editor.setLineWrap("disabled")).toBe("disabled");
    expect(host.dataset.editorWrap).toBe("disabled");
    expect(textarea.getAttribute("wrap")).toBe("off");
  });

  it("applies the initial wrap preference while mounting", () => {
    const { host, textarea } = createEditor("enabled");

    expect(host.dataset.editorWrap).toBe("enabled");
    expect(textarea.getAttribute("wrap")).toBe("soft");
  });

  it("moves focus into the textarea", () => {
    const { editor, textarea } = createEditor();

    editor.focus();

    expect(document.activeElement).toBe(textarea);
  });
});
