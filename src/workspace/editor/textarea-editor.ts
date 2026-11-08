import { normalizeEditorWrap, type EditorWrap } from "../../shared/settings";
import type { SourceHighlightRange } from "../../player/renderer";
import {
  createSourceHighlightFragment,
  normalizeSourceHighlightRanges,
} from "../source-highlight";
import type { AbcEditor, AbcEditorOptions } from "./abc-editor";

/**
 * Today's editor: a plain textarea with a transparent mirror painted under it,
 * so the notes that are sounding can be tinted without touching the text.
 *
 * The mirror is invisible; editor.css keeps both elements on the same font,
 * padding and wrapping so the tint lands on the right glyphs. That shared-metric
 * constraint is exactly what a real code editor would remove.
 */
export function createTextareaEditor({
  host,
  value,
  lineWrap,
  label,
  onChange,
}: AbcEditorOptions): AbcEditor {
  const mirror = document.createElement("pre");
  mirror.className = "abc-highlight-mirror";
  mirror.setAttribute("aria-hidden", "true");
  mirror.hidden = true;

  const textarea = document.createElement("textarea");
  textarea.className = "abc-editor-input";
  textarea.spellcheck = false;
  textarea.value = value;
  textarea.setAttribute("aria-label", label);

  host.replaceChildren(mirror, textarea);

  let highlightKey = "";

  textarea.addEventListener("input", () => {
    // The tinted ranges are offsets into the text as it was a keystroke ago.
    clearPlaybackHighlight();
    onChange();
  });
  textarea.addEventListener("scroll", syncScroll);

  applyLineWrap(lineWrap);

  return {
    getValue: () => textarea.value,
    setValue: (nextValue) => {
      textarea.value = nextValue;
      clearPlaybackHighlight();
    },
    setPlaybackHighlight,
    setLineWrap: applyLineWrap,
    focus: () => textarea.focus(),
  };

  function setPlaybackHighlight(ranges: SourceHighlightRange[]): void {
    const normalizedRanges = normalizeSourceHighlightRanges(
      ranges,
      textarea.value.length,
    );
    const nextKey = normalizedRanges
      .map((range) => `${range.start}:${range.end}`)
      .join(";");

    if (nextKey === highlightKey) {
      syncScroll();
      return;
    }

    highlightKey = nextKey;
    mirror.hidden = normalizedRanges.length === 0;
    if (normalizedRanges.length === 0) {
      mirror.replaceChildren();
      return;
    }

    mirror.replaceChildren(
      createSourceHighlightFragment(textarea.value, normalizedRanges),
    );
    syncScroll();
  }

  function clearPlaybackHighlight(): void {
    setPlaybackHighlight([]);
  }

  function syncScroll(): void {
    mirror.scrollTop = textarea.scrollTop;
    mirror.scrollLeft = textarea.scrollLeft;
  }

  function applyLineWrap(editorWrap: EditorWrap): EditorWrap {
    const normalizedEditorWrap = normalizeEditorWrap(editorWrap);
    host.dataset.editorWrap = normalizedEditorWrap;
    textarea.setAttribute(
      "wrap",
      normalizedEditorWrap === "enabled" ? "soft" : "off",
    );
    if (normalizedEditorWrap === "enabled") textarea.scrollLeft = 0;
    syncScroll();
    return normalizedEditorWrap;
  }
}
