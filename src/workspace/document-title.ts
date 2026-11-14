const APP_NAME = "ABC Desk Web";

/**
 * The tab is part of the score's face. A link is recognised by the tune's own
 * name rather than the app's, and a sheet with no `T:` — or one that does not
 * parse — falls back to the app.
 */
export function formatDocumentTitle(
  tuneTitle: string | null | undefined,
): string {
  // A `T:` line can be padded and folded; the tab has one line.
  const title = tuneTitle?.replace(/\s+/g, " ").trim() ?? "";
  return title ? `${title} — ${APP_NAME}` : APP_NAME;
}
