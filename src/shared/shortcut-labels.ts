/**
 * The About sheet spells its shortcuts as `Mod`, and the modifier is the one
 * part of a combination that differs by machine: a glyph on Apple's keyboards,
 * a word everywhere else. The markup ships the word — a page without script
 * can still read it — and this rewrites the chips once at boot.
 *
 * The transport cannot be rewritten that way: abcjs builds it after a `load()`,
 * inside a shadow root the page's selector never reaches, so the button asks
 * for the same label here and writes it into its own title.
 */
export interface PlatformProbe {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}

const APPLE = /mac|iphone|ipad|ipod|ios/i;

export const MODIFIER_LABELS = { apple: "⌘", other: "Ctrl" } as const;

/** iPadOS answers "MacIntel" to `platform`; the agent string still says iPad. */
export function isApplePlatform(probe: PlatformProbe): boolean {
  const platform = probe.userAgentData?.platform || probe.platform || "";
  if (platform) return APPLE.test(platform);
  return APPLE.test(probe.userAgent ?? "");
}

export function applyModifierLabels(root: ParentNode, isApple: boolean): void {
  const label = isApple ? MODIFIER_LABELS.apple : MODIFIER_LABELS.other;
  for (const element of root.querySelectorAll<HTMLElement>("[data-mod-key]")) {
    element.textContent = label;
  }
}

/**
 * Play from the caret as a title spells it: two glyphs where the keyboard has
 * a symbol for the enter key, two words everywhere else — `Ctrl+↵` would name
 * a key no one's keyboard labels that way.
 */
export function playShortcutLabel(isApple: boolean): string {
  return isApple ? `${MODIFIER_LABELS.apple}↵` : "Ctrl+Enter";
}
