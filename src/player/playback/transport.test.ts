import { afterEach, describe, expect, it, vi } from "vitest";
import type { RenderInstance } from "../types";

const mocks = vi.hoisted(() => ({
  playFromSourceOffset: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("./play-from-cursor", () => ({
  playFromSourceOffset: mocks.playFromSourceOffset,
}));

import { setupTransport, syncPlayFromCursor } from "./transport";

function buildAudio(): HTMLElement {
  const audio = document.createElement("div");
  audio.innerHTML = `
    <div class="abcjs-inline-audio">
      <button type="button" class="abcjs-midi-start">
        <svg class="abcjs-play-svg"><g><polygon points="4 0 23 12.5 4 25"/></g></svg>
      </button>
      <button type="button" class="abcjs-midi-progress-background">
        <span class="abcjs-midi-progress-indicator"></span>
      </button>
      <span class="abcjs-midi-clock"></span>
    </div>
  `;
  return audio;
}

function createInstance(targetOffset: number | null): RenderInstance {
  return {
    audioElement: buildAudio(),
    targetOffset,
  } as unknown as RenderInstance;
}

function getButton(instance: RenderInstance): HTMLButtonElement {
  const button = instance.audioElement.querySelector<HTMLButtonElement>(
    ".abcdesk-play-from-cursor",
  );
  if (!button) throw new Error("no play-from-cursor button");
  return button;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("transport", () => {
  it("puts play-from-cursor in the row, just before play", () => {
    const instance = createInstance(null);

    setupTransport(instance);

    const button = getButton(instance);
    const playButton = instance.audioElement.querySelector(".abcjs-midi-start");
    expect(button.nextElementSibling).toBe(playButton);
    // jsdom reports no platform, so the hint falls back to the words.
    expect(button.title).toBe("Play from cursor (Ctrl+Enter)");
    expect(button.getAttribute("aria-label")).toBe("Play from cursor");
  });

  it("is off until a note is targeted, then on", () => {
    const instance = createInstance(null);

    setupTransport(instance);
    expect(getButton(instance).disabled).toBe(true);

    instance.targetOffset = 8;
    syncPlayFromCursor(instance);
    expect(getButton(instance).disabled).toBe(false);

    instance.targetOffset = null;
    syncPlayFromCursor(instance);
    expect(getButton(instance).disabled).toBe(true);
  });

  it("starts the tune at the target offset", async () => {
    const instance = createInstance(8);
    setupTransport(instance);

    getButton(instance).click();

    expect(mocks.playFromSourceOffset).toHaveBeenCalledWith(instance, 8);
    // A second press would land on a toggling play(), so the button locks
    // itself until the request settles — and comes back if the note is still
    // the target.
    await Promise.resolve();
    expect(getButton(instance).disabled).toBe(false);
  });

  it("does nothing without a target", () => {
    const instance = createInstance(null);
    setupTransport(instance);

    getButton(instance).click();

    expect(mocks.playFromSourceOffset).not.toHaveBeenCalled();
  });

  it("does not stack a second button when the row is rebuilt", () => {
    const instance = createInstance(null);

    setupTransport(instance);
    setupTransport(instance);

    expect(
      instance.audioElement.querySelectorAll(".abcdesk-play-from-cursor"),
    ).toHaveLength(1);
  });
});
