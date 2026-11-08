import {
  findTimingEventForSourceOffset,
  getFirstNoteStart,
} from "../playback/cursor";
import { getTimingEventElements } from "../playback/highlight";
import { getTimingEvents } from "../playback/timing";
import type { RenderInstance } from "../types";

/**
 * Bring the note at a source offset into view, and nothing else: no seeking,
 * no highlight, no focus. Moving the caret is the user saying "I am here",
 * not "play this", so the score only answers by moving itself — and only when
 * the note is actually outside the viewport, which keeps typing calm.
 */
export function revealSourceOffset(
  instance: RenderInstance,
  offset: number,
): boolean {
  const events = getTimingEvents(instance);
  const event = findTimingEventForSourceOffset(events, instance.abcText, offset);
  if (!event) return false;

  // The header lines (X, T, K …) describe the whole sheet, so a caret in them
  // shows the top of it — including the title — instead of the first note.
  const firstNoteStart = getFirstNoteStart(events, instance.abcText);
  if (firstNoteStart !== null && offset < firstNoteStart) {
    instance.scoreElement.scrollTop = 0;
    return true;
  }

  const [note] = getTimingEventElements(event);
  if (!note) return false;

  // A note is a dot; the line it sits on is what a reader needs. abcjs wraps
  // every music line in `.abcjs-staff-wrapper`, so aim there and the staff is
  // never sliced by the edge of the viewport.
  const line = note.closest(".abcjs-staff-wrapper") ?? note;
  line.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}
