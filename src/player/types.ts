import type abcjs from "abcjs";
import type { ThemeMode } from "../shared/settings";
import type { ABCDeskCodeToggleElement } from "./components/code-toggle";
import type { DurationControl } from "./components/duration-control";
import type { KeyboardController, MidiPitch } from "./components/keyboard";
import type { ABCDeskQualityElement } from "./components/quality-panel";
import type { TempoControl } from "./components/tempo-control";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboard: KeyboardController;
  audioElement: HTMLElement;
  qualityElement: ABCDeskQualityElement;
  tempoControl: TempoControl;
  durationControl: DurationControl;
  codeToggleElement: ABCDeskCodeToggleElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  renderedStaffWidth: number;
  synthControl: abcjs.SynthObjectController | null;
  /** Resolves when the current synth control is loaded; null before the first
   *  init and while a re-render is swapping one in. */
  synthReady: Promise<void> | null;
  activePlaybackElements: Element[];
  /** Where the shared target sits, in the rendered text; null when nothing is
   *  pointed at. Kept so a re-render for layout can point at it again. */
  targetOffset: number | null;
  /** SVG nodes carrying the target mark. */
  targetElements: Element[];
  /** abcjs claimed a note for the click in flight, before the score container
   *  heard it; a click nobody claimed was about the paper, not a note. */
  scoreClickClaimed: boolean;
  scoreResizeObserver: ResizeObserver | null;
  scoreResizeTimer: number | undefined;
  pendingPlaybackSeekPercent: number | null;
  pendingPlaybackSeekPromise: Promise<unknown> | null;
  progressDragCleanup: (() => void) | null;
  onSourceHighlight: ((ranges: SourceHighlightRange[]) => void) | undefined;
  onTargetRanges: ((ranges: SourceHighlightRange[]) => void) | undefined;
  onSelectSourceRange: ((range: SourceHighlightRange) => void) | undefined;
  cleanup: () => void;
}

export interface SourceHighlightRange {
  start: number;
  end: number;
}

export interface RenderAbcOptions {
  onSourceHighlight?: (ranges: SourceHighlightRange[]) => void;
  /**
   * The shared target changed: the characters of the pointed note, or nothing
   * when there is no target. The caret and a click both write to it, so the
   * source marks exactly the note the score shows boxed.
   */
  onTargetRanges?: (ranges: SourceHighlightRange[]) => void;
  /** A click on the score names the characters that note was written with. */
  onSelectSourceRange?: (range: SourceHighlightRange) => void;
}

export interface AbcElementRef {
  el_type?: string;
  startChar?: number;
  endChar?: number;
}

export interface TimingEvent {
  type?: string;
  milliseconds: number;
  elements?: unknown[];
  midiPitches?: MidiPitch[];
  millisecondsPerMeasure?: number;
  startChar?: number | null;
  endChar?: number | null;
  startCharArray?: Array<number | null>;
  endCharArray?: Array<number | null>;
}

export type TimedTuneObject = Omit<abcjs.TuneObject, "setTiming"> & {
  noteTimings?: TimingEvent[];
  setTiming?: (qpm?: number, measuresOfDelay?: number) => TimingEvent[];
};

export type SeekableSynthControl = Omit<
  abcjs.SynthObjectController,
  "setProgress"
> & {
  isLoaded?: boolean;
  isStarted?: boolean;
  play?: () => Promise<unknown>;
  seek?: (percent: number) => void;
  setProgress?: (percent: number, totalTime?: number) => void;
  runWhenReady?: (fn: () => Promise<{ status: string }>) => Promise<unknown>;
};
