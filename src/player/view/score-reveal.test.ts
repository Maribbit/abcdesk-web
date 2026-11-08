import { describe, expect, it, vi } from "vitest";
import type { RenderInstance, TimingEvent } from "../types";
import { revealSourceOffset } from "./score-reveal";

//          01234567890123
const TEXT = "X:1\nK:C\nC D E|";

function createNote(): Element {
  const note = document.createElementNS("http://www.w3.org/2000/svg", "path");
  note.scrollIntoView = vi.fn();
  return note;
}

/** abcjs wraps every music line in a group; reveal aims at the line. */
function createNoteOnLine(line: Element): Element {
  const note = createNote();
  line.append(note);
  return note;
}

function createLine(): SVGGElement {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "g");
  line.classList.add("abcjs-staff-wrapper");
  line.scrollIntoView = vi.fn();
  return line;
}

function createInstance(events: TimingEvent[] | null): RenderInstance {
  return {
    abcText: TEXT,
    scoreElement: document.createElement("div"),
    visualObj: events === null ? [] : [{ noteTimings: events }],
  } as unknown as RenderInstance;
}

function createTune() {
  const first = createNote();
  const second = createNote();
  const third = createNote();
  const events: TimingEvent[] = [
    { milliseconds: 0, startChar: 8, endChar: 9, elements: [first] },
    { milliseconds: 500, startChar: 10, endChar: 11, elements: [second] },
    { milliseconds: 1000, startChar: 12, endChar: 13, elements: [third] },
  ];

  return { events, first, second, third };
}

describe("Score reveal", () => {
  it("scrolls the line the caret's note sits on into view", () => {
    const line = createLine();
    const events: TimingEvent[] = [
      {
        milliseconds: 0,
        startChar: 8,
        endChar: 9,
        elements: [createNoteOnLine(line)],
      },
    ];

    expect(revealSourceOffset(createInstance(events), 8)).toBe(true);
    expect(line.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
    });
  });

  it("falls back to the note when the line has no wrapper", () => {
    const { events, second } = createTune();

    expect(revealSourceOffset(createInstance(events), 10)).toBe(true);
    expect(second.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
    });
  });

  it("gives a caret between notes the next one", () => {
    const { events, third } = createTune();

    revealSourceOffset(createInstance(events), 11);

    expect(third.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last note past the end of the tune", () => {
    const { events, third } = createTune();

    revealSourceOffset(createInstance(events), TEXT.length + 40);

    expect(third.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("shows the top of the sheet from a caret in the header", () => {
    const { events, first } = createTune();
    const instance = createInstance(events);
    instance.scoreElement.scrollTop = 240;

    // The X/T/K lines describe the whole sheet, so the sheet starts over.
    expect(revealSourceOffset(instance, 4)).toBe(true);
    expect(instance.scoreElement.scrollTop).toBe(0);
    expect(first.scrollIntoView).not.toHaveBeenCalled();
  });

  it("keeps the score still when nothing has a position on the page", () => {
    const { events, first, second, third } = createTune();
    const withoutElements = createInstance([
      { milliseconds: 0, startChar: 8, endChar: 9 },
    ]);

    expect(revealSourceOffset(createInstance([]), 8)).toBe(false);
    expect(revealSourceOffset(createInstance(null), 8)).toBe(false);
    expect(revealSourceOffset(withoutElements, 8)).toBe(false);
    for (const note of [first, second, third]) {
      expect(note.scrollIntoView).not.toHaveBeenCalled();
    }
    expect(events).toHaveLength(3);
  });
});
