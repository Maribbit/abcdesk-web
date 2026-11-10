/**
 * abcjs draws its transport with solid glyphs meant for a dark, standalone bar:
 * a filled play triangle, two filled pause bars and a `|◀` restart button this
 * app does not show. The rest of the pane speaks one icon language — a 24-unit
 * box drawn at 15px with a 2px round stroke — so the transport borrows that
 * language here rather than asking abcjs for a second one.
 *
 * The markup keeps abcjs's class names (`abcjs-play-svg`, `abcjs-pause-svg`,
 * `abcjs-loading-svg`) because its stylesheet is what shows and hides them, and
 * abcjs toggles the state on the button itself, so the swap survives every
 * press: nothing rewrites this markup except a fresh `load()`.
 */
const ICON_ATTRIBUTES =
  'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

/** Play: outlined like the rest of the row, at the height the stroke makes it. */
const PLAY_ICON = `<svg class="abcjs-play-svg" ${ICON_ATTRIBUTES}><path d="M8 5.25 16.5 12 8 18.75V5.25Z"/></svg>`;

const PAUSE_ICON = `<svg class="abcjs-pause-svg" ${ICON_ATTRIBUTES}><path d="M9.5 5.5v13"/><path d="M14.5 5.5v13"/></svg>`;

const LOADING_ICON = `<svg class="abcjs-loading-svg" ${ICON_ATTRIBUTES}><circle cx="12" cy="12" r="8.5" stroke-dasharray="40 13.4"/></svg>`;

/**
 * Replace the transport's play/pause glyphs with the pane's own. Called after
 * every `SynthController.load()`, which is the only thing that builds the
 * markup we are replacing.
 */
export function applyTransportIcons(audioElement: HTMLElement): void {
  const playButton = audioElement.querySelector<HTMLButtonElement>(
    ".abcjs-midi-start",
  );
  if (!playButton) return;

  playButton.innerHTML = `${PLAY_ICON}${PAUSE_ICON}${LOADING_ICON}`;
}
