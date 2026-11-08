import { describe, expect, it } from "vitest";
import type { TimingEvent } from "../types";
import { findTimingEventForSourceOffset } from "./cursor";

//              012345678901234567890
const SOURCE = "X:1\nK:C\nC D E | F G |";
// Melody line starts at 8: C=8, D=10, E=12, F=16, G=18.

function note(startChar: number, endChar: number, milliseconds: number): TimingEvent {
  return { milliseconds, startChar, endChar, type: "event" };
}

const EVENTS: TimingEvent[] = [
  note(8, 10, 0),
  note(10, 12, 500),
  note(12, 14, 1000),
  note(16, 18, 1500),
  note(18, 20, 2000),
];

describe("finding the note at a source offset", () => {
  it("returns the note the caret is inside", () => {
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, 10)).toBe(EVENTS[1]);
  });

  it("gives the gap after a note to the next note", () => {
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, 9)).toBe(EVENTS[1]);
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, 11)).toBe(EVENTS[2]);
  });

  it("returns the first note when the caret is in the header", () => {
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, 0)).toBe(EVENTS[0]);
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, 7)).toBe(EVENTS[0]);
  });

  it("returns the last note when the caret is past the end", () => {
    expect(findTimingEventForSourceOffset(EVENTS, SOURCE, SOURCE.length)).toBe(
      EVENTS[4],
    );
  });

  it("reads the voice arrays when an event carries several ranges", () => {
    const chord: TimingEvent = {
      milliseconds: 0,
      startCharArray: [16, 8],
      endCharArray: [18, 10],
      type: "event",
    };

    expect(findTimingEventForSourceOffset([chord], SOURCE, 8)).toBe(chord);
    expect(findTimingEventForSourceOffset([chord], SOURCE, 17)).toBe(chord);
  });

  it("ignores events that are not notes", () => {
    const events: TimingEvent[] = [
      { milliseconds: 0, type: "end" },
      note(18, 20, 500),
    ];

    expect(findTimingEventForSourceOffset(events, SOURCE, 0)).toBe(events[1]);
  });

  it("returns null when nothing is timed", () => {
    expect(findTimingEventForSourceOffset([], SOURCE, 8)).toBeNull();
  });
});
