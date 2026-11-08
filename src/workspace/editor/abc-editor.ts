import type { SourceHighlightRange } from "../../player/renderer";
import type { AbcDiagnostic } from "../../shared/abc-quality/diagnostics";
import type { EditorWrap } from "../../shared/settings";

/**
 * The seam between the workspace and whatever edits the source text.
 *
 * Everything outside `src/workspace/editor/` talks to this interface only: the
 * render controller asks for text, the playback loop pushes the ranges that are
 * sounding, and settings push the wrap preference. CodeMirror fills it today —
 * its decorations, keymap and scroll behaviour are all behind this door, so the
 * rest of the workspace never touches the editing DOM.
 */
export interface AbcEditor {
  /** The document exactly as the user sees it, untrimmed. */
  getValue(): string;
  /** Replace the document without firing `onChange`: the caller owns storage. */
  setValue(value: string): void;
  /**
   * Tint the source ranges of the notes that are sounding. Ranges are offsets
   * into the current document, so an implementation must drop them as soon as
   * the text changes — the next render will send new ones.
   */
  setPlaybackHighlight(ranges: SourceHighlightRange[]): void;
  /** Underline the ranges the quality report points at. */
  setDiagnostics(diagnostics: readonly AbcDiagnostic[]): void;
  /** Select the diagnostic's range and bring it into view. */
  revealDiagnostic(diagnostic: AbcDiagnostic): void;
  /**
   * Move the caret to an offset and bring it into view, but leave focus where
   * it is: this marks a place (a note clicked in the score), it is not an
   * invitation to type. The caret is collapsed — the note's own characters are
   * already carried by `setTargetRanges`.
   */
  placeCaret(offset: number): void;
  /**
   * Outline the characters of the note the two panes point at, the source half
   * of the shared target. An empty list removes the outline.
   */
  setTargetRanges(ranges: SourceHighlightRange[]): void;
  /** The caret as an offset into the document. */
  getCursorOffset(): number;
  /** Apply the wrap preference; returns the mode actually in effect. */
  setLineWrap(editorWrap: EditorWrap): EditorWrap;
  focus(): void;
}

export interface AbcEditorOptions {
  /** Mount point: the editor owns everything inside it. */
  host: HTMLElement;
  value: string;
  lineWrap: EditorWrap;
  /** Accessible name for the editing surface. */
  label: string;
  /** The user changed the text (typing, paste, undo) — never `setValue`. */
  onChange: () => void;
  /**
   * The caret moved on its own — an arrow key, a click, a selection. Edits and
   * the workspace's own caret placement both keep quiet: the first moves the
   * caret as a side effect, the second is already known to the caller.
   */
  onCursorChange?: (offset: number) => void;
  /**
   * The user asked to hear the tune from the caret (`Mod-Enter`). The editor
   * knows nothing about playing; it only knows where the caret is.
   */
  onPlayFromCursor?: () => void;
}
