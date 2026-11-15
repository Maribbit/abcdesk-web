/**
 * Both playing verbs are the page's, not the editor's: the caret is the
 * workspace's, and the sheet, the transport and the keys are all read from it,
 * so the two answer wherever the reader's hands happen to be instead of only
 * when the source has the focus.
 *
 * `Mod-Enter` starts at the caret. The editor keeps its own copy of that key so
 * a held modifier never inserts a line; by the time this handler sees it the
 * key has already been claimed, and `defaultPrevented` is how it knows to stay
 * out of the way — otherwise one press in the editor would play twice.
 *
 * The space bar is the transport's own verb — start, stop, start again where it
 * left off — and it is the key every score reader already has in the fingers.
 * It cannot be the page's everywhere: in the source a space is a note, so the
 * field keeps it, exactly as a focused button keeps the space that presses it.
 */
const TEXT_ENTRY = "input, textarea, select, [contenteditable]";

/**
 * A control answers the space bar itself: it presses itself, not the tune. The
 * transport lives in a shadow root, which retargets `event.target` to its host,
 * so every one of these questions is asked of the path's first entry.
 */
const SPACE_OWNERS =
  "button, summary, a[href], [role='button'], [role='switch'], [role='checkbox'], [role='radio'], [role='menuitem'], [role='tab'], input, textarea, select, [contenteditable]";

function originOf(event: KeyboardEvent): EventTarget | null {
  const [origin] = event.composedPath();
  return origin ?? event.target;
}

function isInside(node: EventTarget | null, selector: string): boolean {
  return node instanceof Element && node.closest(selector) !== null;
}

/** Nothing plays behind a sheet the reader is still reading. */
function isCovered(root: ParentNode): boolean {
  return root.querySelector("dialog[open]") !== null;
}

export function isPlayShortcut(event: KeyboardEvent, root: ParentNode): boolean {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.key !== "Enter") return false;
  if (!event.metaKey && !event.ctrlKey) return false;
  if (event.altKey || event.shiftKey) return false;
  if (isCovered(root)) return false;
  return !isInside(originOf(event), TEXT_ENTRY);
}

export function isToggleShortcut(event: KeyboardEvent, root: ParentNode): boolean {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.key !== " ") return false;
  // A modified space belongs to the browser or to the system, not to the tune.
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  if (isCovered(root)) return false;
  return !isInside(originOf(event), SPACE_OWNERS);
}

export interface TransportShortcuts {
  /** `Mod-Enter`: the tune from the caret. */
  playFromCaret: () => void;
  /** The space bar: play, pause, or carry on where the tune stopped. */
  togglePlayback: () => void;
}

export function installTransportShortcuts(
  root: Document,
  { playFromCaret, togglePlayback }: TransportShortcuts,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isPlayShortcut(event, root)) {
      event.preventDefault();
      playFromCaret();
      return;
    }
    if (isToggleShortcut(event, root)) {
      event.preventDefault();
      togglePlayback();
    }
  };

  root.addEventListener("keydown", onKeyDown);
  return () => {
    root.removeEventListener("keydown", onKeyDown);
  };
}
