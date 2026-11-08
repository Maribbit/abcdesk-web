import type { SourceHighlightRange, TimingEvent } from "../types";

export function getTimingEventSourceRanges(
  event: TimingEvent,
  sourceLength: number,
): SourceHighlightRange[] {
  const starts = event.startCharArray ?? [event.startChar ?? null];
  const ends = event.endCharArray ?? [event.endChar ?? null];
  const ranges: SourceHighlightRange[] = [];

  for (let index = 0; index < Math.max(starts.length, ends.length); index++) {
    const start = starts[index];
    const end = ends[index];
    if (typeof start !== "number" || typeof end !== "number") continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const boundedStart = Math.max(0, Math.min(sourceLength, start));
    const boundedEnd = Math.max(0, Math.min(sourceLength, end));
    if (boundedEnd <= boundedStart) continue;
    ranges.push({ start: boundedStart, end: boundedEnd });
  }

  return ranges.filter(
    (range, index) =>
      ranges.findIndex(
        (candidate) =>
          candidate.start === range.start && candidate.end === range.end,
      ) === index,
  );
}

/**
 * abcjs measures a note up to the next one, so its ranges carry the separators
 * around the token. Anything that points at the note itself wants the token
 * alone, without the space that merely kept the notes apart.
 */
export function trimSourceRange(
  text: string,
  range: SourceHighlightRange,
): SourceHighlightRange {
  let start = Math.max(range.start, 0);
  let end = Math.min(range.end, text.length);

  while (start < end && /\s/.test(text[start] ?? "")) start += 1;
  while (end > start && /\s/.test(text[end - 1] ?? "")) end -= 1;

  return { start, end };
}

export function getSourceHighlightRangesForTest(
  event: TimingEvent,
  sourceLength: number,
): SourceHighlightRange[] {
  return getTimingEventSourceRanges(event, sourceLength);
}
