/**
 * Play from the caret is a page-level verb, not an editor binding: the caret is
 * the workspace's, and the sheet, the transport and the keys are all read from
 * it, so the key answers wherever the reader's hands happen to be. The other
 * combinations — comment, undo, redo — act on the text and stay where it is.
 *
 * The editor keeps its own `Mod-Enter` so a held modifier never inserts a line;
 * by the time this handler sees that key it has already been claimed, and
 * `defaultPrevented` is how it knows to stay out of the way — otherwise one
 * press in the editor would play twice.
 */
const TEXT_ENTRY = "input, textarea, select, [contenteditable]";

function isTextEntry(node: EventTarget | null | undefined): boolean {
  return node instanceof Element && node.closest(TEXT_ENTRY) !== null;
}

export function isPlayShortcut(event: KeyboardEvent, root: ParentNode): boolean {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.key !== "Enter") return false;
  if (!event.metaKey && !event.ctrlKey) return false;
  if (event.altKey || event.shiftKey) return false;
  // Nothing plays behind a sheet the reader is still reading.
  if (root.querySelector("dialog[open]")) return false;
  // The transport lives in a shadow root, which retargets `event.target` to its
  // host; the path's first entry is still the field the reader is typing in.
  const [origin] = event.composedPath();
  return !isTextEntry(origin ?? event.target);
}

export function installPlayShortcut(root: Document, play: () => void): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isPlayShortcut(event, root)) return;
    event.preventDefault();
    play();
  };

  root.addEventListener("keydown", onKeyDown);
  return () => {
    root.removeEventListener("keydown", onKeyDown);
  };
}
