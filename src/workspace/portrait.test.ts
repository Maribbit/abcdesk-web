import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import html from "./index.html?raw";
import styles from "./styles/dialogs.css?raw";
import { watchPortraitBlink } from "./portrait";

/** jsdom has no `Element.animate`; the eyes get a spy in its place. */
type BlinkingEye = Element & { animate: Mock };

function mountPortrait(eyes = 2): { root: HTMLElement; eyes: BlinkingEye[] } {
  const root = document.createElement("div");
  root.innerHTML = `<div class="dialog-portrait">${"<g class=\"dialog-portrait-eye\"></g>".repeat(eyes)}</div>`;
  const mounted = Array.from(
    root.querySelectorAll<Element>(".dialog-portrait-eye"),
  ) as BlinkingEye[];

  for (const eye of mounted) eye.animate = vi.fn();
  return { root, eyes: mounted };
}

/** A page that always picks the first branch: the shortest quiet, and a double blink. */
const eager = { random: () => 0, prefersReducedMotion: () => false };

describe("Portrait blink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("squashes both eyes to a line and opens them again, in the blog's 170ms", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, eager);

    vi.advanceTimersByTime(2200);

    for (const eye of eyes) {
      expect(eye.animate).toHaveBeenCalledTimes(1);
      const [frames, timing] = eye.animate.mock.calls[0];
      expect(frames).toEqual([
        { transform: "scaleY(1)" },
        { transform: "scaleY(0.06)", offset: 0.5 },
        { transform: "scaleY(1)" },
      ]);
      expect(timing).toEqual({ duration: 170, easing: "ease-in-out" });
    }

    stop();
  });

  it("keeps the blog's quiet before the first blink", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, eager);

    vi.advanceTimersByTime(2199);
    expect(eyes[0].animate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(eyes[0].animate).toHaveBeenCalledTimes(1);

    stop();
  });

  it("draws its own interval instead of blinking on a beat", () => {
    const { root, eyes } = mountPortrait();
    const longest = {
      random: () => 1,
      prefersReducedMotion: () => false,
    };
    const stop = watchPortraitBlink(root, longest);

    // 2.2s + 4.2s is the top of the blog's range.
    vi.advanceTimersByTime(6399);
    expect(eyes[0].animate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(eyes[0].animate).toHaveBeenCalledTimes(1);

    stop();
  });

  it("follows a blink with a second one now and then", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, eager);

    vi.advanceTimersByTime(2200);
    expect(eyes[0].animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(279);
    expect(eyes[0].animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(eyes[0].animate).toHaveBeenCalledTimes(2);

    stop();
  });

  it("stops blinking when the sheet is closed", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, eager);

    vi.advanceTimersByTime(2200);
    stop();
    vi.advanceTimersByTime(60_000);

    expect(eyes[0].animate).toHaveBeenCalledTimes(1);
  });

  it("calls off the second half of a double blink too", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, eager);

    vi.advanceTimersByTime(2200);
    stop();
    vi.advanceTimersByTime(1000);

    expect(eyes[0].animate).toHaveBeenCalledTimes(1);
  });

  it("leaves the face still for a reader who asked for less motion", () => {
    const { root, eyes } = mountPortrait();
    const stop = watchPortraitBlink(root, {
      random: () => 0,
      prefersReducedMotion: () => true,
    });

    vi.advanceTimersByTime(60_000);

    expect(eyes[0].animate).not.toHaveBeenCalled();
    stop();
  });

  it("is quiet on a sheet without a portrait, and without Element.animate", () => {
    const empty = mountPortrait(0);
    expect(() => watchPortraitBlink(empty.root, eager)()).not.toThrow();

    const plain = mountPortrait();
    for (const eye of plain.eyes) {
      delete (eye as Partial<BlinkingEye>).animate;
    }
    const stop = watchPortraitBlink(plain.root, eager);
    vi.advanceTimersByTime(10_000);
    expect(() => stop()).not.toThrow();
  });
});

describe("About portrait", () => {
  const portrait =
    html.match(/<div class="dialog-portrait"[\s\S]*?<\/svg>/)?.[0] ?? "";

  it("shows the blog's head and hair ornament, and only those", () => {
    expect(portrait).toContain('id="Hair_Accessory"');
    expect(portrait).toContain('id="Eye_R"');
    expect(portrait).toContain('id="Eye_L"');
    // The neck, the mouth and the shadow under the chin are all below the crop.
    expect(portrait).not.toContain('id="Neck_And_Shoulder"');
    expect(portrait).not.toContain('id="Mouse"');
    expect(portrait).not.toContain('id="Head_ShadowOnNeck"');
  });

  it("crops just under the nose, so she has no mouth to show", () => {
    const viewBox = portrait.match(/viewBox="([^"]+)"/)?.[1] ?? "";
    const [, top, , height] = viewBox.split(/\s+/).map(Number);
    // The mouth sits at y=199.478 in the character's own coordinates; the nose
    // ends at 181.978.
    expect(top + height).toBeGreaterThan(181.978);
    expect(top + height).toBeLessThan(199.478);
    expect(portrait).not.toContain("226.5 199.478");
  });

  it("keeps the brows out of the blink, so nothing slides down the face", () => {
    // The blog draws the brows inside each eye group, so its blink drags them
    // 26 units down onto the lids. At 64px that reads as the eyes falling
    // rather than closing, so here they are drawn in a group of their own and
    // only the lids squash.
    const brows = portrait.match(/<g id="Brows"[\s\S]*?<\/g>/)?.[0] ?? "";
    expect(brows.match(/<path /g) ?? []).toHaveLength(4);

    for (const id of ["Eye_R", "Eye_L"]) {
      const eye = portrait.match(new RegExp(`<g id="${id}"[\\s\\S]*?</g>`))?.[0] ?? "";
      // A pupil and a lash, and nothing else: no brows to be squashed.
      expect(eye.match(/<path /g) ?? []).toHaveLength(2);
      expect(eye).not.toContain("#948A88");
      expect(eye).not.toContain("#EAE5E2");
    }
  });

  it("blinks about the blog's pivots, in her own coordinates", () => {
    // 184px 154px and 268px 154px are the blog's figures and have to be kept
    // verbatim: these lengths are read in the coordinate system her paths are
    // drawn in, so the crop's viewBox corner does not shift them. Subtracting
    // that corner — 104px 230px — put the pivots below her chin, and every
    // blink slid the lids 71 units down her face.
    for (const [id, x] of [
      ["Eye_R", 184],
      ["Eye_L", 268],
    ] as const) {
      const origin =
        styles.match(
          new RegExp(`#${id} \\{\\s*transform-origin:\\s*([^;]+);`),
        )?.[1] ?? "";
      expect(origin.trim()).toBe(`${x}px 154px`);
    }

    // The crop is the only thing allowed to carry the corner.
    expect(styles).not.toContain("--portrait-left");
  });
});
