import { describe, expect, it } from "vitest";
import type { TimingEvent } from "../types";
import {
  findTimingEventAtCaret,
  findTimingEventForSourceOffset,
  getFirstNoteStart,
} from "./cursor";

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

describe("the note the caret stands at", () => {
  it("returns the note whose characters the caret is inside", () => {
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 10)).toBe(EVENTS[1]);
  });

  it("keeps the whitespace after a note with that note", () => {
    // Clicking the right edge of C puts the caret after it; C is still the
    // note being read, not D.
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 9)).toBe(EVENTS[0]);
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 11)).toBe(EVENTS[1]);
  });

  it("moves on only at the next note's first character", () => {
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 12)).toBe(EVENTS[2]);
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 16)).toBe(EVENTS[3]);
  });

  it("skips a wider gap without leaving the note behind", () => {
    // E ends at 13 and the bar line sits at 14: the whitespace before it is
    // still E's.
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 14)).toBe(EVENTS[2]);
  });

  it("looks past a bar line at the next bar's first note", () => {
    // The caret is drawn against the character on its left, but a bar line
    // closes a bar: standing just after it means the new bar is being read.
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 15)).toBe(EVENTS[3]);
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 16)).toBe(EVENTS[3]);

    // The last bar ends at the end of the tune: there is no next bar to look
    // at, so the caret stays with the note it just read.
    expect(findTimingEventAtCaret(EVENTS, SOURCE, SOURCE.length)).toBe(
      EVENTS[4],
    );
  });

  it("reads the longer bar line spellings as bar lines too", () => {
    //             0123456789012345678901234567
    const repeats = "X:1\nK:C\nC D |] E F :| G A |";
    const events = [
      note(8, 10, 0),
      note(10, 12, 500),
      note(15, 17, 1000),
      note(17, 19, 1500),
      note(22, 24, 2000),
      note(24, 26, 2500),
    ];

    // After `|]` and after `:|`, the new bar's first note is the target.
    expect(findTimingEventAtCaret(events, repeats, 14)).toBe(events[2]);
    expect(findTimingEventAtCaret(events, repeats, 21)).toBe(events[4]);
    // Standing before the line is still the bar that is ending.
    expect(findTimingEventAtCaret(events, repeats, 12)).toBe(events[1]);
  });

  it("keeps the last note past the end and the first one before it", () => {
    expect(findTimingEventAtCaret(EVENTS, SOURCE, SOURCE.length)).toBe(
      EVENTS[4],
    );
    expect(findTimingEventAtCaret(EVENTS, SOURCE, 0)).toBe(EVENTS[0]);
  });

  it("reads the voice arrays when an event carries several ranges", () => {
    const chord: TimingEvent = {
      milliseconds: 0,
      startCharArray: [16, 8],
      endCharArray: [18, 10],
      type: "event",
    };

    expect(findTimingEventAtCaret([chord], SOURCE, 8)).toBe(chord);
    expect(findTimingEventAtCaret([chord], SOURCE, 17)).toBe(chord);
  });

  it("returns null when nothing is timed", () => {
    expect(findTimingEventAtCaret([], SOURCE, 8)).toBeNull();
  });
});

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

  it("names where the tune starts, past the header", () => {
    expect(getFirstNoteStart(EVENTS, SOURCE)).toBe(8);

    const late: TimingEvent[] = [
      { milliseconds: 0, type: "end" },
      note(16, 18, 500),
    ];
    expect(getFirstNoteStart(late, SOURCE)).toBe(16);
    expect(getFirstNoteStart([], SOURCE)).toBeNull();
  });
});
