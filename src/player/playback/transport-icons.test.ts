import { describe, expect, it } from "vitest";
import { applyTransportIcons } from "./transport-icons";

function buildTransport(): HTMLElement {
  const audio = document.createElement("div");
  audio.innerHTML = `
    <div class="abcjs-inline-audio">
      <button type="button" class="abcjs-midi-start">
        <svg class="abcjs-play-svg"><g><polygon points="4 0 23 12.5 4 25"/></g></svg>
      </button>
      <button type="button" class="abcjs-midi-progress-background"></button>
      <span class="abcjs-midi-clock"></span>
    </div>
  `;
  return audio;
}

describe("transport icons", () => {
  it("replaces abcjs's filled glyphs with the pane's stroke ones", () => {
    const audio = buildTransport();

    applyTransportIcons(audio);

    const button = audio.querySelector(".abcjs-midi-start");
    expect(button?.querySelector("g")).toBeNull();
    expect(
      button?.querySelector(".abcjs-play-svg path")?.getAttribute("d"),
    ).toBe("M8 5.25 16.5 12 8 18.75V5.25Z");
  });

  it("keeps the class names abcjs shows and hides the glyphs with", () => {
    const audio = buildTransport();

    applyTransportIcons(audio);

    expect(
      audio.querySelectorAll(".abcjs-midi-start > svg"),
    ).toHaveLength(3);
    expect(audio.querySelector(".abcjs-pause-svg")).not.toBeNull();
    expect(audio.querySelector(".abcjs-loading-svg")).not.toBeNull();
  });

  it("leaves the rest of the transport untouched", () => {
    const audio = buildTransport();

    applyTransportIcons(audio);

    expect(
      audio.querySelector(".abcjs-midi-progress-background"),
    ).not.toBeNull();
    expect(audio.querySelector(".abcjs-midi-clock")).not.toBeNull();
  });

  it("does nothing when the pane has no transport", () => {
    const audio = document.createElement("div");
    audio.innerHTML = '<p class="abcdesk-no-audio">No audio</p>';
    const before = audio.innerHTML;

    applyTransportIcons(audio);

    expect(audio.innerHTML).toBe(before);
  });
});
