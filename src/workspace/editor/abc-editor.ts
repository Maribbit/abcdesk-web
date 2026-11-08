import type { SourceHighlightRange } from "../../player/renderer";
import type { AbcDiagnostic } from "../../shared/abc-quality/diagnostics";
import type { EditorWrap } from "../../shared/settings";

/**
 * The seam between the workspace and whatever edits the source text.
 *
 * Everything outside `src/workspace/editor/` talks to this interface only: the
 * render controller asks for text, the playback loop pushes the ranges that are
 * sounding, and settings push the wrap preference. The textarea that fills it
 * today is an implementation detail — its mirror, the scroll sync between the
 * two elements and every metric they must share all live behind this door, so
 * a real code editor can replace them without touching the rest of the
 * workspace.
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
}
