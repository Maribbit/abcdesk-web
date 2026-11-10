/**
 * One line under the transport for the one audio failure the reader can act
 * on: the soundfont did not arrive. abcjs collects a missing sample as a
 * blank spot in the audio, so without a sentence here the tune would simply
 * play with holes in it — or not start at all — and say nothing.
 */
export const MISSING_SOUNDS_NOTICE = {
  offline:
    "Offline, and this tune's sounds are not all on this device. Reconnect, then reload.",
  online: "This tune's sounds could not be loaded. Reload to try again.",
} as const;

export function describeMissingSounds(isOffline: boolean): string {
  return isOffline
    ? MISSING_SOUNDS_NOTICE.offline
    : MISSING_SOUNDS_NOTICE.online;
}

/**
 * Say why nothing sounded. One line per transport: a second failure replaces
 * the first instead of stacking another copy under it.
 */
export function reportMissingSounds(
  audioElement: HTMLElement,
  isOffline = isOfflineNow(),
): void {
  const message = describeMissingSounds(isOffline);
  const existing = audioElement.querySelector<HTMLParagraphElement>(
    ".abcdesk-audio-notice",
  );

  if (existing) {
    existing.textContent = message;
    return;
  }

  const notice = document.createElement("p");
  notice.className = "abcdesk-audio-notice";
  // A status, not an alert: the tune itself is fine, and the reader caused
  // the attempt. It only has to be readable, and to be read out when asked.
  notice.setAttribute("role", "status");
  audioElement.append(notice);
  // Fill it after it is in the page: a live region announces the text that
  // arrives in it, not text that was already there when it was inserted.
  notice.textContent = message;
}

function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
