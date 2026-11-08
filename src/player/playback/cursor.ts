import type { SourceHighlightRange, TimingEvent } from "../types";
import { trimSourceRange } from "./source-highlight";

/**
 * The note the caret is standing on, or the next one after it.
 *
 * Timing events are the only thing that knows both a character range and a
 * moment in the tune, so they are the bridge from a caret to a sound. A caret
 * rarely sits *on* a note — it sits in the space after it — so a position
 * between notes belongs to the note that has not been played yet; that is what
 * "play from here" means. Past the last note, the last note is the answer.
 */
export function findTimingEventForSourceOffset(
  events: readonly TimingEvent[],
  text: string,
  offset: number,
): TimingEvent | null {
  const notes = events.filter(isNoteEvent);
  if (notes.length === 0) return null;

  const covering = notes.find((event) =>
    getTimingEventRanges(event, text).some(
      (range) => range.start <= offset && offset < range.end,
    ),
  );
  if (covering) return covering;

  const upcoming = findUpcomingNote(notes, text, offset);

  return upcoming ?? notes[notes.length - 1] ?? null;
}

function isNoteEvent(event: TimingEvent): boolean {
  return !event.type || event.type === "event";
}

/**
 * The note the caret is standing at, for the shared target.
 *
 * This is a different question from "which note do I start playing from":
 * the caret is drawn against the character on its left, so a caret in the
 * whitespace after a note still belongs to that note. Clicking the right edge
 * of the `C` in `C D E` therefore points at `C`, and the target only moves
 * when the caret reaches the next note's first character.
 */
export function findTimingEventAtCaret(
  events: readonly TimingEvent[],
  text: string,
  offset: number,
): TimingEvent | null {
  const notes = events.filter(isNoteEvent);
  if (notes.length === 0) return null;

  // A caret against a bar line looks forward: the line closed the bar that was
  // just read, so the note it points at is the next bar's first one. abcjs
  // measures a note up to the next one, which puts the bar line inside the
  // previous note's range — "the character on the left" would hand this caret
  // to the bar that just ended.
  if (isAfterBarLine(text, offset)) {
    const nextBar = findUpcomingNote(notes, text, offset);
    if (nextBar) return nextBar;
  }

  const covering = notes.find((event) =>
    getTimingEventRanges(event, text).some(
      (range) => range.start <= offset && offset < range.end,
    ),
  );
  if (covering) return covering;

  // Whitespace between notes: the nearest note that ended at or before the
  // caret owns it, because that is the character the caret sits against.
  let previous: TimingEvent | null = null;
  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const event of notes) {
    for (const range of getTimingEventRanges(event, text)) {
      if (range.end <= offset && range.end > previousEnd) {
        previous = event;
        previousEnd = range.end;
      }
    }
  }
  if (previous) return previous;

  // Before the first note: it is still what the caret is looking at.
  return notes[0] ?? null;
}

function findUpcomingNote(
  notes: readonly TimingEvent[],
  text: string,
  offset: number,
): TimingEvent | null {
  return (
    notes.find((event) =>
      getTimingEventRanges(event, text).some((range) => range.start >= offset),
    ) ?? null
  );
}

/**
 * Whether the caret sits just past a bar line, whitespace aside.
 *
 * Each token is one way of writing a bar line in ABC notation; the bare `|`
 * covers the rest of the shapes that end with it.
 */
const BAR_LINE_TOKENS = [
  "|]",
  "||",
  "|:",
  ":|]",
  ":|:",
  ":|",
  "::",
  "[|",
  "[1",
  "[2",
  "|1",
  "|2",
  "|",
];

function isAfterBarLine(text: string, offset: number): boolean {
  let index = offset;
  while (index > 0 && /\s/.test(text[index - 1] ?? "")) index--;
  if (index === 0) return false;

  const before = text.slice(Math.max(0, index - 3), index);
  return BAR_LINE_TOKENS.some((token) => before.endsWith(token));
}

/**
 * Where the tune proper starts. Everything before it is the header — X, T, M,
 * L, Q, K — which belongs to the whole sheet rather than to the first note.
 */
export function getFirstNoteStart(
  events: readonly TimingEvent[],
  text: string,
): number | null {
  const first = events.find(isNoteEvent);
  const [range] = first ? getTimingEventRanges(first, text) : [];
  return range ? range.start : null;
}

/**
 * The characters a timing event was written with, token only: abcjs measures a
 * note up to the next one, so the ranges carry the separators around it.
 */
export function getTimingEventRanges(
  event: TimingEvent,
  text: string,
): SourceHighlightRange[] {
  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];
  const ranges: SourceHighlightRange[] = [];

  for (let index = 0; index < Math.max(starts.length, ends.length); index++) {
    const start = starts[index];
    const end = ends[index];
    if (typeof start !== "number" || typeof end !== "number") continue;

    const range = trimSourceRange(text, { start, end });
    if (range.end > range.start) ranges.push(range);
  }

  return ranges;
}
