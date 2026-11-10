import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const play = vi.fn();
  const pause = vi.fn();
  const seek = vi.fn();
  const setProgress = vi.fn();
  const clickListeners: Array<
    (abcElement: {
      el_type?: string;
      endChar?: number;
      startChar?: number;
    }) => void
  > = [];
  const cursorControls: Array<{
    onEvent?: (event: {
      endChar?: number;
      milliseconds: number;
      startChar?: number;
    }) => void;
    onFinished?: () => void;
  }> = [];
  const transportOptions: Array<Record<string, unknown>> = [];

  return {
    clickListeners,
    cursorControls,
    transportOptions,
    play,
    pause,
    seek,
    setProgress,
    parseOnly: vi.fn(() => [
      {
        warnings: [] as string[],
      },
    ]),
    renderAbc: vi.fn(
      (
        element: HTMLElement,
        _abcText: string,
        params?: {
          clickListener?: (abcElement: {
            el_type?: string;
            endChar?: number;
            startChar?: number;
          }) => void;
        },
      ) => {
        if (params?.clickListener) clickListeners.push(params.clickListener);
        element.textContent = "rendered score";
        return [
          {
            getTotalTime: () => 13,
            setTiming: () => [
              { milliseconds: 0, startChar: 8, endChar: 9, type: "event" },
              { milliseconds: 13000, type: "end" },
            ],
          },
        ];
      },
    ),
    setTune: vi.fn(() => Promise.resolve({ status: "created" })),
  };
});

vi.mock("abcjs", () => ({
  default: {
    parseOnly: mocks.parseOnly,
    renderAbc: mocks.renderAbc,
    synth: {
      supportsAudio: () => true,
      SynthController: class {
        isLoaded = false;
        percent = 0;

        load(
          parent: HTMLElement,
          cursorControl: (typeof mocks.cursorControls)[number],
          options?: Record<string, unknown>,
        ): void {
          mocks.cursorControls.push(cursorControl);
          if (options) mocks.transportOptions.push(options);
          parent.innerHTML = `
            <div class="abcjs-inline-audio">
              <button type="button" class="abcjs-midi-start"></button>
              <button type="button" class="abcjs-midi-progress-background">
                <span class="abcjs-midi-progress-indicator"></span>
              </button>
              <span class="abcjs-midi-clock"></span>
            </div>
          `;
          parent
            .querySelector(".abcjs-midi-start")
            ?.addEventListener("click", () => void this.play());
        }
        setTune = mocks.setTune;
        pause = mocks.pause;
        seek(percent: number): void {
          mocks.seek(percent);
        }
        setProgress(percent: number, totalTime?: number): void {
          this.percent = percent;
          mocks.setProgress(percent, totalTime);
        }
        runWhenReady(
          callback: () => Promise<{ status: string }>,
        ): Promise<{ status: string }> {
          if (!this.isLoaded) {
            this.percent = 0;
            this.isLoaded = true;
          }

          return callback();
        }
        play(): Promise<{ status: string }> {
          mocks.play(this.percent);
          return Promise.resolve({ status: "ok" });
        }
      },
      playEvent: vi.fn(() => Promise.resolve()),
      CreateSynth: class {
        init(): Promise<{
          cached: string[];
          error: string[];
          loaded: string[];
        }> {
          return Promise.resolve({ cached: [], error: [], loaded: [] });
        }
      },
      SynthSequence: class {
        addTrack(): number {
          return 0;
        }
        setInstrument(): void {}
        appendNote(): void {}
      },
    },
  },
}));

import {
  getSourceHighlightRangesForTest,
  playFromSourceOffset,
  removeDisconnectedRenders,
  renderAbc,
} from "./renderer";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("render lifecycle", () => {
  it("stops and removes render instances when their source block is disconnected", async () => {
    const wrapper = document.createElement("section");
    const pre = document.createElement("pre");
    wrapper.append(pre);
    document.body.append(wrapper);

    const instance = renderAbc(pre, "X:1\nK:C\nC|");
    await Promise.resolve();

    expect(instance.container.isConnected).toBe(true);

    wrapper.remove();
    removeDisconnectedRenders();

    expect(mocks.pause).toHaveBeenCalledTimes(1);
    expect(instance.container.isConnected).toBe(false);
  });

  it("shows abcjs warning feedback in rendered score cards", async () => {
    mocks.parseOnly.mockReturnValueOnce([
      {
        warnings: [
          'Music Line:4:5: Unknown character ignored: C D <span style="font-weight:bold;">@</span> |',
        ],
      },
    ]);
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nT:Bad\nK:C\nC D @ |");
    await Promise.resolve();
    const shadowRoot = instance.container.shadowRoot;

    expect(
      shadowRoot?.querySelector(".abcdesk-quality-panel")?.textContent,
    ).toContain("Unknown character ignored");
    expect(
      shadowRoot?.querySelector(".abcdesk-quality-panel")?.textContent,
    ).toContain("Line 4, column 5");
  });

  it("renders scores with abcjs line wrapping enabled", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    renderAbc(pre, "X:1\nK:C\nC|D|E|F|");

    expect(mocks.renderAbc).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(String),
      expect.objectContaining({
        responsive: "resize",
        staffwidth: 716,
        wrap: expect.objectContaining({
          preferredMeasuresPerLine: 4,
          minSpacing: 1.2,
          maxSpacing: 2.4,
        }),
      }),
    );
  });

  it("puts the transport above the sheet and leaves no restart button", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    // The playhead belongs above the sheet, where the reader is looking. Ordering
    // is the whole point, so assert document order rather than styles.
    expect(
      instance.audioElement.compareDocumentPosition(instance.scoreElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      mocks.transportOptions[mocks.transportOptions.length - 1],
    ).toMatchObject({ displayRestart: false });
  });

  it("draws the transport glyphs in the pane's own icon language", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    const playButton = instance.audioElement.querySelector(".abcjs-midi-start");
    const playIcon = playButton?.querySelector(".abcjs-play-svg");
    expect(playIcon?.getAttribute("fill")).toBe("none");
    expect(playIcon?.getAttribute("stroke")).toBe("currentColor");
    expect(playIcon?.getAttribute("width")).toBe("15");
    expect(playButton?.querySelector(".abcjs-pause-svg")).not.toBeNull();
    expect(playButton?.querySelector(".abcjs-loading-svg")).not.toBeNull();
  });

  it("seeks continuously while dragging the playback progress bar", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
      ".abcjs-midi-progress-background",
    );
    expect(progressBar).not.toBeNull();
    if (!progressBar) return;

    Object.defineProperty(progressBar, "clientWidth", {
      configurable: true,
      value: 200,
    });
    progressBar.getBoundingClientRect = () =>
      ({
        bottom: 10,
        height: 10,
        left: 100,
        right: 300,
        top: 0,
        width: 200,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    progressBar.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 150,
      }),
    );
    progressBar.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 250 }),
    );
    progressBar.dispatchEvent(
      new MouseEvent("pointerup", { bubbles: true, clientX: 300 }),
    );

    expect(mocks.seek).toHaveBeenCalledWith(0.25);
    expect(mocks.seek).toHaveBeenCalledWith(0.75);
    expect(mocks.seek).toHaveBeenLastCalledWith(1);
    expect(mocks.setProgress).toHaveBeenLastCalledWith(1, 13000);
  });

  it("starts first playback from the dragged progress position", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|D|E|F|");
    await Promise.resolve();

    const playButton =
      instance.audioElement.querySelector<HTMLButtonElement>(
        ".abcjs-midi-start",
      );
    const progressBar = instance.audioElement.querySelector<HTMLButtonElement>(
      ".abcjs-midi-progress-background",
    );
    expect(playButton).not.toBeNull();
    expect(progressBar).not.toBeNull();
    if (!playButton || !progressBar) return;

    Object.defineProperty(progressBar, "clientWidth", {
      configurable: true,
      value: 200,
    });
    progressBar.getBoundingClientRect = () =>
      ({
        bottom: 10,
        height: 10,
        left: 100,
        right: 300,
        top: 0,
        width: 200,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    progressBar.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 250,
      }),
    );
    await Promise.resolve();
    playButton.click();

    expect(mocks.play).toHaveBeenCalledWith(0.75);
  });

  it("normalizes playback source highlight ranges", () => {
    expect(
      getSourceHighlightRangesForTest(
        {
          milliseconds: 0,
          startCharArray: [8, 16, 8, null],
          endCharArray: [9, 18, 9, 24],
        },
        20,
      ),
    ).toEqual([
      { start: 8, end: 9 },
      { start: 16, end: 18 },
    ]);

    expect(
      getSourceHighlightRangesForTest(
        {
          milliseconds: 0,
          startChar: 22,
          endChar: 30,
        },
        24,
      ),
    ).toEqual([{ start: 22, end: 24 }]);
  });

  it("notifies source highlight callbacks during playback events", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    const instance = renderAbc(
      pre,
      "X:1\nK:C\nC|",
      undefined,
      undefined,
      undefined,
      { onSourceHighlight },
    );
    await Promise.resolve();
    const cursorControl = mocks.cursorControls[mocks.cursorControls.length - 1];
    if (!instance.synthControl) return;
    Object.assign(instance.synthControl, { isStarted: true });

    cursorControl?.onEvent?.({
      milliseconds: 0,
      startChar: 8,
      endChar: 9,
    });
    cursorControl?.onFinished?.();

    expect(onSourceHighlight).toHaveBeenCalledWith([{ start: 8, end: 9 }]);
    expect(onSourceHighlight).toHaveBeenLastCalledWith([]);
  });

  it("ignores the note at a playhead that is not playing", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    renderAbc(pre, "X:1\nK:C\nC|", undefined, undefined, undefined, {
      onSourceHighlight,
    });
    await Promise.resolve();
    const cursorControl = mocks.cursorControls[mocks.cursorControls.length - 1];

    // abcjs fires this same callback when a seek passes a note, so a stopped
    // tune would light whatever the playhead crossed.
    cursorControl?.onEvent?.({ milliseconds: 0, startChar: 8, endChar: 9 });

    expect(onSourceHighlight).not.toHaveBeenCalled();
  });

  it("clears the highlight when playback is paused", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    const instance = renderAbc(pre, "X:1\nK:C\nC|", undefined, undefined, undefined, {
      onSourceHighlight,
    });
    await Promise.resolve();
    const cursorControl = mocks.cursorControls[mocks.cursorControls.length - 1];
    if (!instance.synthControl) return;
    Object.assign(instance.synthControl, { isStarted: true });

    cursorControl?.onEvent?.({ milliseconds: 0, startChar: 8, endChar: 9 });
    expect(onSourceHighlight).toHaveBeenLastCalledWith([{ start: 8, end: 9 }]);

    instance.synthControl?.pause();

    expect(mocks.pause).toHaveBeenCalledTimes(1);
    expect(onSourceHighlight).toHaveBeenLastCalledWith([]);
  });

  it("offers play-from-cursor in the transport once a note is targeted", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    const instance = renderAbc(pre, "X:1\nK:C\nC|");
    const playFromCursor =
      instance.audioElement.querySelector<HTMLButtonElement>(
        ".abcdesk-play-from-cursor",
      );
    expect(playFromCursor?.disabled).toBe(true);

    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];
    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    instance.scoreElement.click();

    // The button rides on the shared target: one note picked, one action offered.
    expect(playFromCursor?.disabled).toBe(false);
    expect(
      playFromCursor?.nextElementSibling,
    ).toBe(instance.audioElement.querySelector(".abcjs-midi-start"));
  });

  it("points both panes at the note that was clicked", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSelectSourceRange = vi.fn();
    const onTargetRanges = vi.fn();

    renderAbc(pre, "X:1\nK:C\nC|", undefined, undefined, undefined, {
      onSelectSourceRange,
      onTargetRanges,
    });
    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];

    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    expect(onSelectSourceRange).toHaveBeenCalledWith({ start: 8, end: 9 });
    // The click and the caret share one mapping: the score marks the same note
    // the source does, so the outline and the box always agree.
    expect(onTargetRanges).toHaveBeenLastCalledWith([{ start: 8, end: 9 }]);

    // Bar lines and titles are clickable too, but they name no note.
    clickListener?.({});
    expect(onSelectSourceRange).toHaveBeenCalledTimes(1);
    expect(onTargetRanges).toHaveBeenLastCalledWith([]);
  });

  it("lets go of the target when the click misses every note", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onTargetRanges = vi.fn();

    const instance = renderAbc(
      pre,
      "X:1\nK:C\nC|",
      undefined,
      undefined,
      undefined,
      { onTargetRanges },
    );
    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];

    // First gesture: a note, claimed by abcjs before the container hears it.
    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    instance.scoreElement.click();
    expect(onTargetRanges).toHaveBeenLastCalledWith([{ start: 8, end: 9 }]);

    // Second gesture: empty paper, nobody claims it.
    instance.scoreElement.dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    );
    instance.scoreElement.click();

    expect(onTargetRanges).toHaveBeenLastCalledWith([]);
  });

  it("keeps the target abcjs claimed for the click", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onTargetRanges = vi.fn();

    const instance = renderAbc(
      pre,
      "X:1\nK:C\nC|",
      undefined,
      undefined,
      undefined,
      { onTargetRanges },
    );
    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];

    // abcjs picks the nearest note, so its reach is wider than the glyph; the
    // container must defer to that reach instead of asking where the DOM event
    // landed.
    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    instance.scoreElement.click();

    expect(onTargetRanges).toHaveBeenLastCalledWith([{ start: 8, end: 9 }]);
  });

  it("moves the playhead without lighting a note the tune is not playing", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    renderAbc(pre, "X:1\nK:C\nC|", undefined, undefined, undefined, {
      onSourceHighlight,
    });
    await Promise.resolve();
    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];

    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.seek).toHaveBeenCalled();
    // Nothing is sounding, so nothing wears the sound's colour. A lit note
    // here would stay behind once the reader points somewhere else, and the
    // sheet would show the target and the click as two selections.
    expect(onSourceHighlight).not.toHaveBeenCalled();
  });

  it("lights the note it seeks to while the tune is playing", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onSourceHighlight = vi.fn();

    const instance = renderAbc(
      pre,
      "X:1\nK:C\nC|",
      undefined,
      undefined,
      undefined,
      { onSourceHighlight },
    );
    await Promise.resolve();
    const clickListener = mocks.clickListeners[mocks.clickListeners.length - 1];
    if (!instance.synthControl) return;
    Object.assign(instance.synthControl, { isStarted: true });

    clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
    await Promise.resolve();
    await Promise.resolve();

    expect(onSourceHighlight).toHaveBeenLastCalledWith([
      { start: 8, end: 9 },
    ]);
  });

  it("keeps the target when the sheet is redrawn at a new width", () => {
    const pre = document.createElement("pre");
    document.body.append(pre);
    const onTargetRanges = vi.fn();
    const resizeCallbacks: Array<() => void> = [];
    const realResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;

    try {
      const instance = renderAbc(
        pre,
        "X:1\nK:C\nC|",
        undefined,
        undefined,
        undefined,
        { onTargetRanges },
      );

      // The pane narrows, so the sheet is redrawn for the new staff width and
      // abcjs is handed a fresh click listener.
      instance.scoreElement.getBoundingClientRect = () =>
        ({
          bottom: 300,
          height: 300,
          left: 0,
          right: 400,
          top: 0,
          width: 400,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
      vi.useFakeTimers();
      resizeCallbacks[resizeCallbacks.length - 1]?.();
      vi.advanceTimersByTime(200);
      vi.useRealTimers();

      const clickListener =
        mocks.clickListeners[mocks.clickListeners.length - 1];
      clickListener?.({ el_type: "note", endChar: 9, startChar: 7 });
      // The container hears the same click right after abcjs does; the fresh
      // listener still has to claim the note, or the paper takes it back.
      instance.scoreElement.click();

      expect(onTargetRanges).toHaveBeenLastCalledWith([{ start: 8, end: 9 }]);
    } finally {
      vi.useRealTimers();
      globalThis.ResizeObserver = realResizeObserver;
    }
  });

  it("waits for the synth before playing from a caret", async () => {
    const pre = document.createElement("pre");
    document.body.append(pre);

    // Nothing awaited yet: the soundfont is still loading, so the controller
    // would be null for anyone who reads it now.
    const instance = renderAbc(pre, "X:1\nK:C\nC|");

    await expect(playFromSourceOffset(instance, 8)).resolves.toBe(true);
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });
});
