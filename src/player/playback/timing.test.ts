import { describe, expect, it, vi } from "vitest";
import type { RenderInstance } from "../types";
import { getTimingEvents } from "./timing";

function createInstance(tune: Record<string, unknown>): RenderInstance {
  return { visualObj: [tune] } as unknown as RenderInstance;
}

function createTune() {
  return {
    setUpAudio: vi.fn(),
    setTiming: vi.fn(() => [
      { milliseconds: 0, startChar: 8, endChar: 9, midiPitches: [{ pitch: 60 }] },
    ]),
  };
}

describe("The timings of a tune", () => {
  it("flattens the tune so its events can name their pitches", () => {
    const tune = createTune();

    getTimingEvents(createInstance(tune));

    // An event learns the pitches of its note only from the flattener — the
    // step the soundfont would run the moment the reader plays. It needs no
    // audio, so it runs before the first timing is read: the keyboard can then
    // show the tune's notes, and the note the panes point at, from the start.
    expect(tune.setUpAudio).toHaveBeenCalled();
    expect(tune.setTiming).toHaveBeenCalled();
  });

  it("still reads the timings of a tune the flattener rejects", () => {
    const tune = createTune();
    tune.setUpAudio.mockImplementation(() => {
      throw new Error("cannot read this tune");
    });

    expect(getTimingEvents(createInstance(tune))).toHaveLength(1);
  });

  it("reads the timings of a drawn tune just once", () => {
    const tune = createTune();
    const instance = createInstance(tune);

    const first = getTimingEvents(instance);
    const second = getTimingEvents(instance);

    expect(second).toBe(first);
    expect(tune.setTiming).toHaveBeenCalledTimes(1);
  });
});
