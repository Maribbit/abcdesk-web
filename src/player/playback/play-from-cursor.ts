import type { RenderInstance, SeekableSynthControl } from "../types";
import { findTimingEventForSourceOffset } from "./cursor";
import { highlightTimingEvent } from "./highlight";
import { seekPlaybackToPercent } from "./progress";
import { getSeekPercentForTimingEvent, getTimingEvents } from "./timing";

/**
 * Start the tune at the note nearest a character offset in the source: the
 * chord under the caret, or the next one if the caret sits between notes.
 * Returns false when there is nothing to play (no timing, no synth).
 *
 * The wait matters: a fresh render swaps the synth control and reloads the
 * soundfont, so a request that lands in that window must queue behind it
 * rather than act on a controller that is about to be replaced.
 */
export async function playFromSourceOffset(
  instance: RenderInstance,
  offset: number,
): Promise<boolean> {
  await instance.synthReady;

  const event = findTimingEventForSourceOffset(
    getTimingEvents(instance),
    instance.abcText,
    offset,
  );
  if (!event) return false;

  const percent = getSeekPercentForTimingEvent(instance, event);
  const synthControl = instance.synthControl as SeekableSynthControl | null;
  if (percent === null || !synthControl) return false;

  seekPlaybackToPercent(instance, percent);
  // `play` toggles, so only call it when the tune is actually stopped.
  if (synthControl.isStarted !== true) void synthControl.play?.();
  highlightTimingEvent(instance, event);
  return true;
}
