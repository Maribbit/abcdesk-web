import { describe, expect, it } from "vitest";
import {
  describeMissingSounds,
  MISSING_SOUNDS_NOTICE,
  reportMissingSounds,
} from "./audio-notice";

describe("missing sounds notice", () => {
  it("tells the reader to reconnect when the page is offline", () => {
    expect(describeMissingSounds(true)).toBe(MISSING_SOUNDS_NOTICE.offline);
    expect(describeMissingSounds(true)).toMatch(/offline/i);
  });

  it("asks for a reload when the network was available", () => {
    expect(describeMissingSounds(false)).toBe(MISSING_SOUNDS_NOTICE.online);
    expect(describeMissingSounds(false)).toMatch(/reload/i);
  });

  it("adds one status line under the transport", () => {
    const audio = document.createElement("div");

    reportMissingSounds(audio, true);

    const notices = audio.querySelectorAll(".abcdesk-audio-notice");
    expect(notices).toHaveLength(1);
    expect(notices[0].getAttribute("role")).toBe("status");
    expect(notices[0].textContent).toBe(MISSING_SOUNDS_NOTICE.offline);
  });

  it("replaces the sentence instead of stacking another", () => {
    const audio = document.createElement("div");
    audio.append(document.createElement("div"));

    reportMissingSounds(audio, true);
    reportMissingSounds(audio, false);

    const notices = audio.querySelectorAll(".abcdesk-audio-notice");
    expect(notices).toHaveLength(1);
    expect(notices[0].textContent).toBe(MISSING_SOUNDS_NOTICE.online);
  });

  it("keeps the transport where it was", () => {
    const audio = document.createElement("div");
    const transport = document.createElement("div");
    transport.className = "abcjs-inline-audio";
    audio.append(transport);

    reportMissingSounds(audio, false);

    expect(audio.firstElementChild).toBe(transport);
    expect(audio.lastElementChild?.className).toBe("abcdesk-audio-notice");
  });
});
