import abcjs from "abcjs";
import type { RenderInstance, TimingEvent } from "../types";
import { getTuneDurationSeconds } from "./duration";
import {
  clearPlaybackHighlight,
  highlightTimingEvent,
  setupKeyboard,
} from "./highlight";
import { setupProgressDrag } from "./progress";
import { getLocalPianoSynthOptions } from "./soundfont";
import { getTimingEvents } from "./timing";

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
export async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.audioElement;
  instance.progressDragCleanup?.();
  instance.progressDragCleanup = null;
  instance.tempoControl.reset();
  instance.durationControl.reset();

  if (!abcjs.synth.supportsAudio()) {
    audioEl.innerHTML =
      '<p class="abcdesk-no-audio">Audio playback not supported in this browser.</p>';
    return;
  }

  try {
    const synthControl = new abcjs.synth.SynthController();
    synthControl.load(audioEl, createCursorControl(instance), {
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    });
    bindPauseClear(instance, synthControl);

    await synthControl.setTune(
      instance.visualObj[0],
      false,
      getLocalPianoSynthOptions(),
    );
    instance.synthControl = synthControl;
    instance.progressDragCleanup = setupProgressDrag(instance);
    setupDurationControl(instance);
    setupTempoControl(instance);
  } catch (err) {
    console.error("[ABC Desk] Synth init error:", err);
    audioEl.innerHTML =
      '<p class="abcdesk-no-audio">Failed to initialize audio playback.</p>';
  }
}

function createCursorControl(instance: RenderInstance): object {
  return {
    onReady: () => setupKeyboard(instance),
    onStart: () => clearPlaybackHighlight(instance),
    onEvent: (event: TimingEvent) => highlightTimingEvent(instance, event),
    onFinished: () => clearPlaybackHighlight(instance),
  };
}

/**
 * The cursor control hears start, notes and the end of the tune, but not pause:
 * abcjs stops its timer and buffer silently. Every pause path — the built-in
 * button, a re-render, a dispose — runs through the controller's own pause, so
 * wrapping it is the one place that catches them all; otherwise the tint stays
 * stranded on whatever note was sounding.
 */
function bindPauseClear(
  instance: RenderInstance,
  synthControl: abcjs.SynthObjectController,
): void {
  const pause = synthControl.pause.bind(synthControl);

  synthControl.pause = () => {
    pause();
    clearPlaybackHighlight(instance);
  };
}

function setupTempoControl(instance: RenderInstance): void {
  const nativeTempoInput = instance.audioElement.querySelector(
    ".abcjs-midi-tempo",
  ) as HTMLInputElement | null;

  if (!nativeTempoInput) return;

  instance.tempoControl.connect(nativeTempoInput, instance.visualObj?.[0]);
}

function setupDurationControl(instance: RenderInstance): void {
  instance.durationControl.mount(instance.audioElement);
  instance.durationControl.setDuration(
    getTuneDurationSeconds(instance.visualObj?.[0], getTimingEvents(instance)),
  );
}
