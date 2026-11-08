import type { TimingEvent } from "../types";
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
    getEventRanges(event, text).some(
      (range) => range.start <= offset && offset < range.end,
    ),
  );
  if (covering) return covering;

  const upcoming = notes.find((event) =>
    getEventRanges(event, text).some((range) => range.start >= offset),
  );
  if (upcoming) return upcoming;

  return notes[notes.length - 1] ?? null;
}

function isNoteEvent(event: TimingEvent): boolean {
  return !event.type || event.type === "event";
}

function getEventRanges(
  event: TimingEvent,
  text: string,
): { start: number; end: number }[] {
  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];
  const ranges: { start: number; end: number }[] = [];

  for (let index = 0; index < Math.max(starts.length, ends.length); index++) {
    const start = starts[index];
    const end = ends[index];
    if (typeof start !== "number" || typeof end !== "number") continue;

    const range = trimSourceRange(text, { start, end });
    if (range.end > range.start) ranges.push(range);
  }

  return ranges;
}
