import {
  Annotation,
  Compartment,
  EditorState,
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  drawSelection,
  gutterLineClass,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
  type KeyBinding,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import type {
  AbcDiagnostic,
  AbcDiagnosticSeverity,
} from "../../shared/abc-quality/diagnostics";
import { normalizeEditorWrap } from "../../shared/settings";
import type { SourceHighlightRange } from "../../player/renderer";
import { normalizeSourceHighlightRanges } from "../source-highlight";
import type { AbcEditor, AbcEditorOptions } from "./abc-editor";
import { classifyAbcSource, type AbcSyntaxKind } from "./abc-syntax";

/**
 * CodeMirror 6, without `basicSetup`.
 *
 * basicSetup brings bracket closing and autocompletion, which in ABC are not
 * helpers but interference: `[V:1]`, `"chord"`, `%` and `|` are all meaningful
 * characters, and the vocabulary has no members to complete against. What is
 * left here is the part that makes typing pleasant and undo trustworthy.
 */
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--workspace-code-bg)",
    color: "var(--workspace-code-text)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13.5px",
    lineHeight: "1.62",
    padding: "18px 16px",
  },
  ".cm-content": { padding: "0", caretColor: "var(--workspace-accent)" },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--workspace-accent)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--workspace-code-select)",
  },
  // The margin is a reference, and the sheet is the only object on the page:
  // no panel, no rule, just numbers set a step back from the ink.
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--workspace-code-gutter)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    position: "relative",
    minWidth: "2ch",
    padding: "0 16px 0 0",
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--workspace-code-text)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--workspace-code-active-line)",
  },
  // A diagnostic names a line, so the margin points at it: the same grey-blue
  // as the wave under the tokens, never a red light, and solid enough to be
  // seen without looking for it.
  ".cm-lineNumbers .cm-gutterElement.abc-diagnostic-gutter::after": {
    content: '""',
    position: "absolute",
    right: "6px",
    top: "50%",
    width: "5px",
    height: "5px",
    marginTop: "-2.5px",
    borderRadius: "50%",
    backgroundColor: "var(--workspace-diagnostic-strong)",
  },
});

const syntaxMarks: Record<AbcSyntaxKind, Decoration> = {
  comment: Decoration.mark({ class: "abc-syn-comment" }),
  field: Decoration.mark({ class: "abc-syn-field" }),
  bar: Decoration.mark({ class: "abc-syn-bar" }),
};

const diagnosticMarks: Record<AbcDiagnosticSeverity, Decoration> = {
  error: Decoration.mark({ class: "abc-diagnostic-token is-error" }),
  warning: Decoration.mark({ class: "abc-diagnostic-token is-warning" }),
  suggestion: Decoration.mark({ class: "abc-diagnostic-token is-suggestion" }),
};

interface MarkSpan {
  from: number;
  to: number;
  decoration: Decoration;
}

interface DiagnosticSpan {
  from: number;
  to: number;
  severity: AbcDiagnosticSeverity;
}

const setDiagnosticSpans = StateEffect.define<DiagnosticSpan[]>();

const syntaxDecorations = StateField.define<DecorationSet>({
  create: (state) => buildSyntaxDecorations(state.doc),
  update: (decorations, transaction) =>
    transaction.docChanged
      ? buildSyntaxDecorations(transaction.state.doc)
      : decorations,
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * A layer of marks driven by source ranges: the note that is sounding and the
 * note the two panes point at are the same kind of thing, so they are the same
 * kind of layer.
 */
function rangeMarkLayer(className: string): {
  set: (ranges: SourceHighlightRange[]) => StateEffect<SourceHighlightRange[]>;
  field: StateField<DecorationSet>;
} {
  const mark = Decoration.mark({ class: className });
  const setEffect = StateEffect.define<SourceHighlightRange[]>();
  // `StateEffectType.of` is a method, so it cannot be handed around on its
  // own: detaching it would lose the type it belongs to.
  const set = (ranges: SourceHighlightRange[]) => setEffect.of(ranges);

  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, transaction) => {
      for (const effect of transaction.effects) {
        if (!effect.is(setEffect)) continue;
        return buildMarkDecorations(
          effect.value.map((range) => ({
            from: range.start,
            to: range.end,
            decoration: mark,
          })),
        );
      }
      // Ranges are offsets into the text as it was; an edit invalidates them.
      return transaction.docChanged ? Decoration.none : decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  return { set, field };
}

const playbackLayer = rangeMarkLayer("abc-live-token");
const targetLayer = rangeMarkLayer("abc-target-token");

const diagnosticDecorations = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) => {
    for (const effect of transaction.effects) {
      if (!effect.is(setDiagnosticSpans)) continue;
      return buildMarkDecorations(
        effect.value.map((span) => ({
          from: span.from,
          to: span.to,
          decoration: diagnosticMarks[span.severity],
        })),
      );
    }
    return transaction.docChanged ? Decoration.none : decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * A line with a diagnostic gets a dot in the margin. `lineNumbers` owns the
 * gutter's text; a line class is the one thing a marker can add to it, so the
 * dot is drawn by the theme rather than by a plugin element.
 */
class DiagnosticGutterMarker extends GutterMarker {
  elementClass = "abc-diagnostic-gutter";
}

const diagnosticMarker = new DiagnosticGutterMarker();

const diagnosticGutter = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update: (markers, transaction) => {
    for (const effect of transaction.effects) {
      if (!effect.is(setDiagnosticSpans)) continue;
      return buildDiagnosticMarkers(transaction.state.doc, effect.value);
    }
    return transaction.docChanged ? RangeSet.empty : markers;
  },
  provide: (field) => gutterLineClass.from(field),
});

export function createCodeMirrorEditor({
  host,
  value,
  lineWrap,
  label,
  onChange,
  onCursorChange,
  onPlayFromCursor,
}: AbcEditorOptions): AbcEditor {
  const wrapCompartment = new Compartment();
  const quietChange = Annotation.define<boolean>();
  const initialWrap = normalizeEditorWrap(lineWrap);

  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        keymap.of([
          ...playKeymap(onPlayFromCursor),
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorState.tabSize.of(2),
        EditorView.contentAttributes.of({
          "aria-label": label,
          autocapitalize: "off",
          autocomplete: "off",
          spellcheck: "false",
        }),
        editorTheme,
        syntaxDecorations,
        playbackLayer.field,
        targetLayer.field,
        diagnosticDecorations,
        diagnosticGutter,
        wrapCompartment.of(
          initialWrap === "enabled" ? EditorView.lineWrapping : [],
        ),
        EditorView.updateListener.of((update) => {
          if (update.transactions.some((tr) => tr.annotation(quietChange))) {
            return;
          }
          if (update.docChanged) {
            onChange();
            return;
          }
          // A plain caret move. An edit moves the caret too, but its new
          // position is only meaningful once the score has caught up.
          if (update.selectionSet) {
            onCursorChange?.(update.state.selection.main.head);
          }
        }),
      ],
    }),
  });

  host.dataset.editorWrap = initialWrap;

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (nextValue) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: nextValue },
        selection: { anchor: 0 },
        annotations: quietChange.of(true),
      });
    },
    setPlaybackHighlight: (ranges) => {
      const normalizedRanges = normalizeSourceHighlightRanges(
        ranges,
        view.state.doc.length,
      );
      view.dispatch({
        effects: playbackLayer.set(normalizedRanges),
        annotations: Transaction.addToHistory.of(false),
      });
    },
    setTargetRanges: (ranges) => {
      const normalizedRanges = normalizeSourceHighlightRanges(
        ranges,
        view.state.doc.length,
      );
      view.dispatch({
        effects: targetLayer.set(normalizedRanges),
        annotations: Transaction.addToHistory.of(false),
      });
    },
    setLineWrap: (editorWrap) => {
      const normalizedEditorWrap = normalizeEditorWrap(editorWrap);
      host.dataset.editorWrap = normalizedEditorWrap;
      view.dispatch({
        effects: wrapCompartment.reconfigure(
          normalizedEditorWrap === "enabled" ? EditorView.lineWrapping : [],
        ),
        annotations: Transaction.addToHistory.of(false),
      });
      return normalizedEditorWrap;
    },
    setDiagnostics: (diagnostics) => {
      view.dispatch({
        effects: setDiagnosticSpans.of(
          toDiagnosticSpans(view.state.doc, diagnostics),
        ),
        annotations: Transaction.addToHistory.of(false),
      });
    },
    revealDiagnostic: (diagnostic) => {
      const [span] = toDiagnosticSpans(view.state.doc, [diagnostic]);
      if (!span) return;
      view.dispatch({
        selection: { anchor: span.from, head: span.to },
        effects: EditorView.scrollIntoView(span.from, { y: "center" }),
        annotations: Transaction.addToHistory.of(false),
      });
      view.focus();
    },
    placeCaret: (offset) => {
      const length = view.state.doc.length;
      const caret = Math.min(Math.max(offset, 0), length);
      view.dispatch({
        selection: { anchor: caret },
        effects: EditorView.scrollIntoView(caret, { y: "nearest" }),
        // Silent: the caller already knows where it asked the caret to go.
        annotations: [Transaction.addToHistory.of(false), quietChange.of(true)],
      });
    },
    getCursorOffset: () => view.state.selection.main.head,
    focus: () => view.focus(),
  };
}

/**
 * `Mod-Enter` belongs to the workspace, not to CodeMirror: the editor only
 * reports the intent, because "play from here" is not an editing command.
 */
function playKeymap(onPlayFromCursor?: () => void): KeyBinding[] {
  if (!onPlayFromCursor) return [];

  return [
    {
      key: "Mod-Enter",
      preventDefault: true,
      run: () => {
        onPlayFromCursor();
        return true;
      },
    },
  ];
}

function buildSyntaxDecorations(doc: Text): DecorationSet {
  return buildMarkDecorations(
    classifyAbcSource(doc.toString()).map((span) => ({
      from: span.from,
      to: span.to,
      decoration: syntaxMarks[span.kind],
    })),
  );
}

function buildMarkDecorations(spans: readonly MarkSpan[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const span of spans) {
    if (span.to <= span.from) continue;
    builder.add(span.from, span.to, span.decoration);
  }
  return builder.finish();
}

/**
 * One marker per line, in document order, because `gutterLineClass` is a range
 * set and diagnostics arrive already sorted by offset.
 */
function buildDiagnosticMarkers(
  doc: Text,
  spans: readonly DiagnosticSpan[],
): RangeSet<GutterMarker> {
  const builder = new RangeSetBuilder<GutterMarker>();
  let previousLine = 0;

  for (const span of spans) {
    const line = doc.lineAt(span.from);
    if (line.number === previousLine) continue;
    previousLine = line.number;
    builder.add(line.from, line.from, diagnosticMarker);
  }

  return builder.finish();
}

/**
 * abcjs reports a 1-based line and column; the underline runs from that column
 * to the end of the line, because the message names a position, not a length.
 */
function toDiagnosticSpans(
  doc: Text,
  diagnostics: readonly AbcDiagnostic[],
): DiagnosticSpan[] {
  const spans: DiagnosticSpan[] = [];

  for (const diagnostic of diagnostics) {
    const lineNumber = diagnostic.line;
    if (lineNumber === undefined) continue;
    if (lineNumber < 1 || lineNumber > doc.lines) continue;

    const line = doc.line(lineNumber);
    const column = Math.max((diagnostic.column ?? 1) - 1, 0);
    const from = Math.min(line.from + column, line.to);
    if (line.to <= from) continue;

    spans.push({ from, to: line.to, severity: diagnostic.severity });
  }

  spans.sort(
    (first, second) => first.from - second.from || first.to - second.to,
  );

  // Marks may not overlap: several diagnostics can land on the same line.
  const merged: DiagnosticSpan[] = [];
  for (const span of spans) {
    const previous = merged[merged.length - 1];
    if (previous && span.from < previous.to) continue;
    merged.push(span);
  }

  return merged;
}
