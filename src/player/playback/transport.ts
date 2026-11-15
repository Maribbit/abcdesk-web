import { isApplePlatform, playShortcutLabel } from "../../shared/shortcut-labels";
import type { RenderInstance } from "../types";
import { playFromSourceOffset } from "./play-from-cursor";
import { applyTransportIcons } from "./transport-icons";

const PLAY_FROM_CURSOR_CLASS = "abcdesk-play-from-cursor";
const PLAY_BUTTON_SELECTOR = ".abcjs-midi-start";

/**
 * A triangle with a text cursor pinned to its right: the note under the caret
 * is where the sound starts, so the two halves of the action sit side by side
 * instead of stacked. Drawn at 15px inside a 28px button, the way the pane
 * header draws its glyphs, and at the play button's own triangle height — the
 * pair sits next to each other, so neither may outweigh the other.
 */
const PLAY_FROM_CURSOR_ICON = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 5.25 13 12 5 18.75V5.25Z"/>
    <path d="M17.25 5.25v13.5"/>
    <path d="M15.5 5.25h3.5"/>
    <path d="M15.5 18.75h3.5"/>
  </svg>`;

/**
 * Finish the transport abcjs built: the pane's icons, plus the one action it
 * has no button for — start the tune at the note the reader picked. Runs after
 * every `load()`, which is the only thing that rebuilds the row.
 */
export function setupTransport(instance: RenderInstance): void {
  applyTransportIcons(instance.audioElement);
  labelPlayButton(instance);
  insertPlayFromCursorButton(instance);
  syncPlayFromCursor(instance);
}

/**
 * The page answers the space bar for the same toggle, so the button says which
 * key it is — the habit its neighbour on the left already has. The name stays
 * the plain action, because a screen reader has no use for a key it cannot
 * press.
 */
function labelPlayButton(instance: RenderInstance): void {
  const button = getPlayButton(instance);
  if (!button) return;
  button.title = "Play or pause (Space)";
  button.setAttribute("aria-label", "Play or pause");
}

function getPlayButton(instance: RenderInstance): HTMLButtonElement | null {
  return instance.audioElement.querySelector<HTMLButtonElement>(
    PLAY_BUTTON_SELECTOR,
  );
}

/**
 * The page's space bar presses the button rather than re-implementing it: the
 * toggle abcjs owns is the one that knows about the spinner while the soundfont
 * loads, about starting over at the end of the tune, and about the pause that
 * takes the highlight down with it. A second copy of that state machine would
 * only drift. False when there is no transport to press — no tune, or no audio.
 */
export function toggleTransportPlayback(instance: RenderInstance): boolean {
  const button = getPlayButton(instance);
  if (!button) return false;
  button.click();
  return true;
}

/**
 * The button rides on the shared target, so the two can never disagree: no
 * target means there is no note to start from and nothing to press.
 */
export function syncPlayFromCursor(instance: RenderInstance): void {
  const button = getPlayFromCursorButton(instance);
  if (button) button.disabled = instance.targetOffset === null;
}

function getPlayFromCursorButton(
  instance: RenderInstance,
): HTMLButtonElement | null {
  return instance.audioElement.querySelector<HTMLButtonElement>(
    `.${PLAY_FROM_CURSOR_CLASS}`,
  );
}

function insertPlayFromCursorButton(instance: RenderInstance): void {
  const playButton = getPlayButton(instance);
  if (!playButton) return;

  getPlayFromCursorButton(instance)?.remove();

  const button = document.createElement("button");
  button.type = "button";
  button.className = `abcjs-btn ${PLAY_FROM_CURSOR_CLASS}`;
  // The page answers this action from anywhere, so the tooltip says which keys
  // do it: a button that can be reached without the mouse should say how.
  button.title = `Play from cursor (${playShortcutLabel(isApplePlatform(navigator))})`;
  button.setAttribute("aria-label", "Play from cursor");
  button.disabled = true;
  button.innerHTML = PLAY_FROM_CURSOR_ICON;

  button.addEventListener("click", () => {
    const offset = instance.targetOffset;
    if (offset === null) return;

    // The first press may wait for the soundfont, and `play` is a toggle: a
    // second press inside that window would turn the tune back off.
    button.disabled = true;
    void playFromSourceOffset(instance, offset).finally(() => {
      syncPlayFromCursor(instance);
    });
  });

  // Before the primary play button: the specific action leads, the plain one
  // follows, and both stay left of the bar they belong to.
  playButton.before(button);
}
