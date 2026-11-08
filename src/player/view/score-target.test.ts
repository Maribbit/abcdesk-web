import { describe, expect, it, vi } from "vitest";
import type { RenderInstance, TimingEvent } from "../types";
import { clearTarget, pointSourceOffset } from "./score-target";

//          0123456789012
const TEXT = "X:1\nK:C\nC D E|";
// Melody starts at 8: C=8, D=10, E=12.

const SVG_NS = "http://www.w3.org/2000/svg";

interface Score {
  score: HTMLElement;
  svg: SVGSVGElement;
}

function createScore(): Score {
  const score = document.createElement("div");
  const svg = document.createElementNS(SVG_NS, "svg");
  score.append(svg);
  return { score, svg };
}

function createNote(svg: SVGSVGElement): SVGPathElement {
  const note = document.createElementNS(SVG_NS, "path");
  note.scrollIntoView = vi.fn();
  svg.append(note);
  return note;
}

/** abcjs wraps every music line in a group; pointing reveals the line. */
function createLine(svg: SVGSVGElement): SVGGElement {
  const line = document.createElementNS(SVG_NS, "g");
  line.classList.add("abcjs-staff-wrapper");
  line.scrollIntoView = vi.fn();
  svg.append(line);
  return line;
}

function createInstance(
  events: TimingEvent[] | null,
  { score }: Score = createScore(),
): RenderInstance {
  return {
    abcText: TEXT,
    scoreElement: score,
    visualObj: events === null ? [] : [{ noteTimings: events }],
    targetElements: [],
    targetOffset: null,
    onTargetRanges: undefined,
    keyboard: {
      clearPointedPitches: vi.fn(),
      setPointedPitches: vi.fn(),
    },
  } as unknown as RenderInstance;
}

function createTune() {
  const { score, svg } = createScore();
  const first = createNote(svg);
  const second = createNote(svg);
  const third = createNote(svg);
  const events: TimingEvent[] = [
    {
      milliseconds: 0,
      startChar: 8,
      endChar: 9,
      elements: [[first]],
      midiPitches: [{ pitch: 60 }],
    },
    {
      milliseconds: 500,
      startChar: 10,
      endChar: 11,
      elements: [[second]],
      midiPitches: [{ pitch: 62 }],
    },
    {
      milliseconds: 1000,
      startChar: 12,
      endChar: 13,
      elements: [[third]],
      midiPitches: [{ pitch: 64 }],
    },
  ];

  return { events, first, score, second, svg, third };
}

describe("The shared target", () => {
  it("marks the note under the caret", () => {
    const { events, first, second } = createTune();
    const instance = createInstance(events);

    expect(pointSourceOffset(instance, 10)).toBe(true);
    expect(second.classList.contains("abcdesk-target")).toBe(true);

    // Latest wins: the old mark is lifted, not added to.
    pointSourceOffset(instance, 8);
    expect(first.classList.contains("abcdesk-target")).toBe(true);
    expect(second.classList.contains("abcdesk-target")).toBe(false);
  });

  it("names the characters the source side outlines", () => {
    const { events } = createTune();
    const onTargetRanges = vi.fn();
    const instance = createInstance(events);
    instance.onTargetRanges = onTargetRanges;

    pointSourceOffset(instance, 10);

    // Trimmed to the token: the space that separated the notes is not the note.
    expect(onTargetRanges).toHaveBeenCalledWith([{ start: 10, end: 11 }]);
  });

  it("keeps a caret in the whitespace with the note before it", () => {
    const { events, second, third } = createTune();

    // The caret is drawn against the character on its left, so the space after
    // D still points at D — clicking the right edge of a note must not jump
    // the target to the next one.
    pointSourceOffset(createInstance(events), 11);
    expect(second.classList.contains("abcdesk-target")).toBe(true);

    // Only the next note's first character moves the target.
    pointSourceOffset(createInstance(events), 12);
    expect(third.classList.contains("abcdesk-target")).toBe(true);
  });

  it("gives a caret past the end the last note", () => {
    const { events, third } = createTune();

    pointSourceOffset(createInstance(events), TEXT.length + 40);

    expect(third.classList.contains("abcdesk-target")).toBe(true);
  });

  it("points at nothing from the header and shows the top of the sheet", () => {
    const { events, first, score, svg } = createTune();
    const onTargetRanges = vi.fn();
    const instance = createInstance(events, { score, svg });
    instance.onTargetRanges = onTargetRanges;
    instance.scoreElement.scrollTop = 240;

    expect(pointSourceOffset(instance, 4)).toBe(false);
    expect(instance.scoreElement.scrollTop).toBe(0);
    expect(onTargetRanges).toHaveBeenCalledWith([]);
    expect(first.classList.contains("abcdesk-target")).toBe(false);
  });

  it("points at nothing when there is no timing", () => {
    const onTargetRanges = vi.fn();
    const instance = createInstance([]);
    instance.onTargetRanges = onTargetRanges;

    expect(pointSourceOffset(instance, 8)).toBe(false);
    expect(pointSourceOffset(createInstance(null), 8)).toBe(false);
    expect(onTargetRanges).toHaveBeenLastCalledWith([]);
  });

  it("brings the line the note sits on into view", () => {
    const { score, svg } = createScore();
    const line = createLine(svg);
    const note = createNote(svg);
    line.append(note);
    const instance = createInstance(
      [{ milliseconds: 0, startChar: 8, endChar: 9, elements: [[note]] }],
      { score, svg },
    );

    pointSourceOffset(instance, 8);

    expect(line.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
    });
    expect(note.scrollIntoView).not.toHaveBeenCalled();
  });

  it("lights the keys the target stands for", () => {
    const { events } = createTune();
    const instance = createInstance(events);
    const setPointedPitches = vi.mocked(instance.keyboard.setPointedPitches);
    const clearPointedPitches = vi.mocked(
      instance.keyboard.clearPointedPitches,
    );

    pointSourceOffset(instance, 10);
    expect(setPointedPitches).toHaveBeenLastCalledWith([{ pitch: 62 }]);

    clearTarget(instance);
    expect(clearPointedPitches).toHaveBeenCalled();
  });

  it("lifts everything on clear", () => {
    const { events, score, second, svg } = createTune();
    const onTargetRanges = vi.fn();
    const instance = createInstance(events, { score, svg });
    instance.onTargetRanges = onTargetRanges;
    pointSourceOffset(instance, 10);

    clearTarget(instance);

    expect(second.classList.contains("abcdesk-target")).toBe(false);
    expect(instance.targetOffset).toBeNull();
    expect(onTargetRanges).toHaveBeenLastCalledWith([]);
    expect(svg.querySelectorAll(".abcdesk-target-box")).toHaveLength(0);
  });
});

describe("The dashed box", () => {
  function frame(left: number, top: number, width: number, height: number) {
    return {
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  }

  function setUp(scale = 1) {
    const { score, svg } = createScore();
    // 500 user units across, rendered into a 500 / scale pixel frame.
    Object.defineProperty(svg, "viewBox", {
      value: { baseVal: { x: 0, y: 0, width: 500, height: 100 } },
    });
    svg.getBoundingClientRect = () => frame(100, 50, 500 / scale, 100 / scale);

    const note = createNote(svg);
    // The note keeps its place on the sheet; the sheet itself is what shrinks.
    note.getBoundingClientRect = () =>
      frame(100 + 20 / scale, 50 + 10 / scale, 10 / scale, 10 / scale);

    const instance = createInstance(
      [{ milliseconds: 0, startChar: 8, endChar: 9, elements: [[note]] }],
      { score, svg },
    );

    return { instance, note, score, svg };
  }

  it("rides inside the score's own SVG, padded around the note", () => {
    const { instance, svg } = setUp();

    pointSourceOffset(instance, 8);

    const boxes = svg.querySelectorAll<SVGRectElement>(".abcdesk-target-box");
    expect(boxes).toHaveLength(1);
    // The note is 20px in from the sheet's left edge, 10px down from its top.
    expect(boxes[0]?.getAttribute("x")).toBe("17");
    expect(boxes[0]?.getAttribute("y")).toBe("7");
    expect(boxes[0]?.getAttribute("width")).toBe("16");
    expect(boxes[0]?.getAttribute("height")).toBe("16");
  });

  it("maps screen pixels back to user units when the sheet is scaled", () => {
    // Half the size: two user units to every screen pixel.
    const { instance, svg } = setUp(2);

    pointSourceOffset(instance, 8);

    const [box] = svg.querySelectorAll<SVGRectElement>(".abcdesk-target-box");
    // The note's 10 screen pixels are 20 user units here, and the padding is
    // measured on screen as well, so the box keeps hugging the note instead
    // of drifting away from it as the sheet shrinks.
    expect(box?.getAttribute("x")).toBe("14");
    expect(box?.getAttribute("y")).toBe("4");
    expect(box?.getAttribute("width")).toBe("22");
    expect(box?.getAttribute("height")).toBe("22");
  });

  it("draws one box per note cluster", () => {
    const { score, svg } = createScore();
    Object.defineProperty(svg, "viewBox", {
      value: { baseVal: { x: 0, y: 0, width: 500, height: 100 } },
    });
    svg.getBoundingClientRect = () => frame(0, 0, 500, 100);

    const head = createNote(svg);
    const stem = createNote(svg);
    for (const element of [head, stem]) {
      element.getBoundingClientRect = () => frame(120, 60, 10, 10);
    }
    const tied = createNote(svg);
    tied.getBoundingClientRect = () => frame(200, 60, 10, 10);

    const instance = createInstance(
      [
        {
          milliseconds: 0,
          startChar: 8,
          endChar: 9,
          // A chord is one cluster; the continuation of a tie is its own.
          elements: [[head, stem], [tied]],
        },
      ],
      { score, svg },
    );

    pointSourceOffset(instance, 8);

    expect(svg.querySelectorAll(".abcdesk-target-box")).toHaveLength(2);
    expect(head.classList.contains("abcdesk-target")).toBe(true);
    expect(tied.classList.contains("abcdesk-target")).toBe(true);
  });
});
