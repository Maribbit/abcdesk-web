/**
 * The header says when the page has no network. Offline is a state of the
 * app, not a failure of it — the saved copy still opens, edits still land on
 * the device — so the bar carries a quiet label instead of a warning laid
 * over the music. The tooltip only promises the saved copy when a worker is
 * actually serving one; otherwise "offline" is all we know.
 */
export interface ConnectionNoticeOptions {
  element: HTMLElement;
  online?: () => boolean;
  controlled?: () => boolean;
  target?: EventTarget;
}

const NO_NETWORK_TITLE = "No network";
const SAVED_COPY_TITLE = "No network — this page runs from its saved copy";

export function watchConnectionNotice({
  element,
  online = () => navigator.onLine,
  controlled = () =>
    typeof navigator !== "undefined" &&
    navigator.serviceWorker?.controller !== null &&
    navigator.serviceWorker?.controller !== undefined,
  target = window,
}: ConnectionNoticeOptions): () => void {
  const reflect = (): void => {
    const isOnline = online();
    element.hidden = isOnline;
    element.title = isOnline
      ? ""
      : controlled()
        ? SAVED_COPY_TITLE
        : NO_NETWORK_TITLE;
  };

  reflect();
  target.addEventListener("online", reflect);
  target.addEventListener("offline", reflect);

  return () => {
    target.removeEventListener("online", reflect);
    target.removeEventListener("offline", reflect);
  };
}
