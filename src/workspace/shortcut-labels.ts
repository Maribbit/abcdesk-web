/**
 * The About sheet spells its shortcuts as `Mod`, and the modifier is the one
 * part of a combination that differs by machine: a glyph on Apple's keyboards,
 * a word everywhere else. The markup ships the word — a page without script
 * can still read it — and this rewrites the chips once at boot.
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
