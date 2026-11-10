/** The three greys a source file is painted in, and nothing else. */
export type AbcSyntaxKind = "comment" | "field" | "bar";

export interface AbcSyntaxSpan {
  from: number;
  to: number;
  kind: AbcSyntaxKind;
}

const FIELD_LINE = /^[A-Za-z]:/;

/**
 * Classify one line of ABC source into the spans that recede: header metadata,
 * `%` comments, and bar lines.
 *
 * This is deliberately a scanner rather than a parser. The sheet is painted in
 * three greys — metadata, annotation and structure — while notes stay in the
 * ink of the music, so anything unrecognised is simply left alone. A real ABC
 * grammar would buy stricter highlighting at the cost of a parser, a token
 * table and a colour vocabulary the design does not have.
 *
 * A line is the unit an edit invalidates, and the scan is line-local, so the
 * editor can rescan just the lines a keystroke reached instead of the file.
 */
export function classifyAbcLine(line: string): AbcSyntaxSpan[] {
  const spans: AbcSyntaxSpan[] = [];
  const commentStart = line.indexOf("%");
  const code = commentStart === -1 ? line : line.slice(0, commentStart);

  if (FIELD_LINE.test(code)) {
    spans.push({ from: 0, to: code.length, kind: "field" });
  } else if (code.length > 0) {
    for (const match of code.matchAll(/\[?[|:]+\]?/g)) {
      const from = match.index ?? 0;
      spans.push({ from, to: from + match[0].length, kind: "bar" });
    }
  }

  if (commentStart !== -1) {
    spans.push({ from: commentStart, to: line.length, kind: "comment" });
  }

  return spans;
}

/** The same scan for a whole source, with offsets measured from its start. */
export function classifyAbcSource(sourceText: string): AbcSyntaxSpan[] {
  const spans: AbcSyntaxSpan[] = [];
  let offset = 0;

  for (const line of sourceText.split("\n")) {
    for (const span of classifyAbcLine(line)) {
      spans.push({
        from: offset + span.from,
        to: offset + span.to,
        kind: span.kind,
      });
    }
    offset += line.length + 1;
  }

  return spans;
}
