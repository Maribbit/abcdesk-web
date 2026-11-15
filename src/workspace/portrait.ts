/**
 * The blink on the About sheet's portrait.
 *
 * She is the character from the author's blog, drawn with the blog's own head
 * and hair ornament, so she blinks the way she blinks there: both eyes squash
 * towards their lid line and open again in 170ms, at irregular intervals, and
 * now and then twice in a row. A face that blinked on a metronome would read as
 * a loading indicator.
 */

/** One blink, from open to open. The blog's own duration. */
const BLINK_MS = 170;
/** The quiet between blinks, before the spread: the blog's 2.2s – 6.4s. */
const BLINK_QUIET_MIN_MS = 2200;
const BLINK_QUIET_SPREAD_MS = 4200;
/** How often a blink is followed by a second one, and how far behind. */
const DOUBLE_BLINK_CHANCE = 0.28;
const DOUBLE_BLINK_GAP_MS = 280;
/** The squash at the bottom of the blink: an eyelid, not a line. */
const BLINK_CLOSED_SCALE = 0.06;

export interface PortraitBlinkOptions {
  /** Draws the interval; a page uses `Math.random`. */
  random?: () => number;
  /** Asked once, at the start: a face is a decoration, not a demand. */
  prefersReducedMotion?: () => boolean;
}

/**
 * Blinks the portrait inside `root` until the returned function is called. A
 * page without a portrait, a browser without `Element.animate` and a reader who
 * asked for less motion all get the same quiet no-op.
 */
export function watchPortraitBlink(
  root: ParentNode,
  options: PortraitBlinkOptions = {},
): () => void {
  const eyes = Array.from(
    root.querySelectorAll<SVGGElement>(".dialog-portrait-eye"),
  );
  const random = options.random ?? Math.random;
  const prefersReducedMotion =
    options.prefersReducedMotion ?? readReducedMotion;

  if (eyes.length === 0) return () => {};
  if (eyes.some((eye) => typeof eye.animate !== "function")) return () => {};
  if (prefersReducedMotion()) return () => {};

  const timers = new Set<number>();
  let stopped = false;

  const later = (run: () => void, delay: number): void => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (stopped) return;
      run();
    }, delay);
    timers.add(timer);
  };

  const blink = (): void => {
    for (const eye of eyes) {
      eye.animate(
        [
          { transform: "scaleY(1)" },
          { transform: `scaleY(${BLINK_CLOSED_SCALE})`, offset: 0.5 },
          { transform: "scaleY(1)" },
        ],
        { duration: BLINK_MS, easing: "ease-in-out" },
      );
    }
  };

  const scheduleNextBlink = (): void => {
    later(() => {
      blink();
      if (random() < DOUBLE_BLINK_CHANCE) later(blink, DOUBLE_BLINK_GAP_MS);
      scheduleNextBlink();
    }, BLINK_QUIET_MIN_MS + random() * BLINK_QUIET_SPREAD_MS);
  };

  scheduleNextBlink();

  return () => {
    stopped = true;
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
  };
}

/** jsdom has no `matchMedia`, and an older browser may not either. */
function readReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
