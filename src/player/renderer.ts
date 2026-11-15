/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import abcdeskAudioStyles from "./view/styles/audio.css?inline";
import abcdeskHeaderStyles from "./view/styles/header.css?inline";
import abcdeskHostStyles from "./view/styles/host.css?inline";
import abcdeskKeyboardStyles from "./view/styles/keyboard.css?inline";
import abcdeskLayoutStyles from "./view/styles/layout.css?inline";
import abcdeskPrintStyles from "./view/styles/print.css?inline";
import abcdeskQualityStyles from "./view/styles/quality.css?inline";
import abcdeskScoreStyles from "./view/styles/score.css?inline";
import type { ABCDeskCodeToggleElement } from "./components/code-toggle";
import {
  DEFAULT_CODE_BLOCK_VISIBILITY,
  DEFAULT_KEYBOARD_VISIBILITY,
  DEFAULT_THEME_MODE,
  type CodeBlockVisibility,
  type KeyboardVisibility,
  type ThemeMode,
} from "../shared/settings";
import { getExtensionRuntime } from "../shared/extension-runtime";
import { createOpenWorkspaceMessage } from "../shared/messages";
import type { ABCDeskQualityElement } from "./components/quality-panel";
import { createDurationControl } from "./components/duration-control";
import { createKeyboardController } from "./components/keyboard";
import { exportMidi, exportScore } from "./exports/actions";
import { reportMissingSounds } from "./playback/audio-notice";
import { playLocalPianoPitch } from "./playback/soundfont";
import { trimSourceRange } from "./playback/source-highlight";
import { createTempoControl } from "./components/tempo-control";
import { seekPlaybackToPercent } from "./playback/progress";
import {
  clearPlaybackHighlight,
  highlightTimingEvent,
  setupKeyboard,
} from "./playback/highlight";
import { initSynth } from "./playback/synth";
import {
  findMatchingTimingEvent,
  getSeekPercentForElement,
} from "./playback/timing";
import { playFromSourceOffset } from "./playback/play-from-cursor";
export { playFromSourceOffset };
import { copyQualityFeedback, updateQualityPanel } from "./quality";
export { getSourceHighlightRangesForTest } from "./playback/source-highlight";
export type {
  RenderAbcOptions,
  RenderInstance,
  SourceHighlightRange,
} from "./types";
import { applyRenderViewTheme, createRenderView } from "./view/view";
import { setupPrintPagination } from "./view/print-pages";
import { clearTarget, pointSourceOffset } from "./view/score-target";
export { clearTarget, pointSourceOffset };
import type {
  AbcElementRef,
  RenderAbcOptions,
  RenderInstance,
  SeekableSynthControl,
} from "./types";
import {
  disposeScoreResizeObserver,
  renderScore,
  setupScoreResizeObserver,
  shouldRerenderScoreForLayout,
} from "./view/score-render";

const instances = new Map<Element, RenderInstance>();
const shadowStyles = [
  abcjsAudioStyles,
  abcdeskHostStyles,
  abcdeskHeaderStyles,
  abcdeskQualityStyles,
  abcdeskScoreStyles,
  abcdeskKeyboardStyles,
  abcdeskAudioStyles,
  abcdeskLayoutStyles,
  // Last, so the medium's rules win over the screen's layout regardless of
  // which layout attribute the host is wearing.
  abcdeskPrintStyles,
].join("\n");

/**
 * A click on the score means "this note": it becomes the shared target, so the
 * same note is boxed here and outlined in the source, and the source caret
 * follows to the characters it was written with. Focus stays where it was —
 * the click is a pointer, not an invitation to type. Seeking is independent:
 * a tune with no audio still deserves the target.
 */
function handleScoreClick(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): void {
  // The container hears every click; abcjs hears only those near a selectable,
  // and it speaks first (on the way up, before the click). Claiming here — in
  // the one path every listener is built from — is what lets the container
  // tell "a note" from "the paper around it" even after a re-render handed
  // abcjs a fresh listener.
  instance.scoreClickClaimed = true;
  pointAtAbcElement(instance, abcElement);
  void seekToAbcElement(instance, abcElement);
}

function pointAtAbcElement(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): void {
  const { startChar, endChar } = abcElement;
  if (
    abcElement.el_type === "note" &&
    typeof startChar === "number" &&
    typeof endChar === "number" &&
    endChar > startChar
  ) {
    const range = trimSourceRange(instance.abcText, {
      start: startChar,
      end: endChar,
    });
    if (range.end > range.start) {
      // The same path as the caret: one mapping, one meaning, latest wins.
      pointSourceOffset(instance, range.start);
      instance.onSelectSourceRange?.(range);
      return;
    }
  }

  // Bar lines, titles and clefs are not notes: the target has nowhere to go.
  clearTarget(instance);
}

/**
 * Move the playhead to the clicked note.
 *
 * Pointing and playing are separate questions: the click already named the
 * shared target, and a tune with no audio still deserves it. What happens here
 * is only where the music would start from — and, when it is already playing,
 * which note now sounds.
 */
async function seekToAbcElement(
  instance: RenderInstance,
  abcElement: AbcElementRef,
): Promise<void> {
  const matchingEvent = findMatchingTimingEvent(instance, abcElement);
  const percent = matchingEvent
    ? getSeekPercentForElement(instance, abcElement)
    : null;
  if (percent === null || matchingEvent === null || !instance.synthControl)
    return;

  const synthControl = instance.synthControl as SeekableSynthControl;
  const seek = () => {
    seekPlaybackToPercent(instance, percent);
    return Promise.resolve({ status: "ok" });
  };

  if (synthControl.runWhenReady) {
    await synthControl.runWhenReady(seek);
  } else {
    seek();
  }

  // Directly fire the highlight — abcjs may skip the event when seeking lands
  // exactly on its time boundary (e.g. the last note before a bar line) — but
  // only while the tune is playing. A stopped tune that moves its playhead
  // makes no sound, and a silent note must not wear the sound's colour: it
  // would stay lit after the reader points somewhere else, and the sheet would
  // show two selections at once.
  if (synthControl.isStarted === true) {
    highlightTimingEvent(instance, matchingEvent);
  }
}

/**
 * Render ABC notation for a given <pre> element.
 * Creates the container, renders SVG, and sets up playback.
 */
export function renderAbc(
  preElement: Element,
  abcText: string,
  themeMode: ThemeMode = DEFAULT_THEME_MODE,
  codeBlockVisibility: CodeBlockVisibility = DEFAULT_CODE_BLOCK_VISIBILITY,
  keyboardVisibility: KeyboardVisibility = DEFAULT_KEYBOARD_VISIBILITY,
  options: RenderAbcOptions = {},
): RenderInstance {
  // If already rendered, update instead of creating new
  const existing = instances.get(preElement);
  if (existing) {
    existing.onSourceHighlight = options.onSourceHighlight;
    existing.onSelectSourceRange = options.onSelectSourceRange;
    existing.onTargetRanges = options.onTargetRanges;
    applyTheme(existing, themeMode);
    applyKeyboardVisibility(existing, keyboardVisibility);
    if (existing.abcText === abcText) return existing;
    return updateRender(existing, abcText, themeMode);
  }

  let instance: RenderInstance | null = null;
  // Pressing down starts a new gesture: whatever the last one claimed is done.
  const resetScoreClickClaim = (): void => {
    if (instance) instance.scoreClickClaimed = false;
  };
  const handleScoreBackgroundClick = (): void => {
    if (!instance) return;
    // The claim is made on the way up (see `handleScoreClick`), so by now it
    // already knows whether a note was picked — by the same rules the
    // highlight follows.
    if (!instance.scoreClickClaimed) clearTarget(instance);
    instance.scoreClickClaimed = false;
  };
  const runtime = getExtensionRuntime();
  const elements = createRenderView(preElement, themeMode, shadowStyles, {
    onCopyQualityFeedback: () => {
      if (instance) copyQualityFeedback(instance);
    },
    onExportScore: () => {
      if (instance) exportScore(instance);
    },
    onExportMidi: () => {
      if (instance) exportMidi(instance);
    },
    onOpenWorkspace: runtime?.sendMessage
      ? () => {
          if (instance) {
            void runtime.sendMessage?.(
              createOpenWorkspaceMessage(instance.abcText),
            );
          }
        }
      : undefined,
    onToggleCode: () => {
      if (instance) setCodeCollapsed(instance, !instance.isCodeCollapsed);
    },
  });
  const keyboard = createKeyboardController(
    elements.keyboardElement,
    elements.keyboardToggleElement,
    keyboardVisibility === "visible",
    (pitch) => {
      if (instance) playKeyboardPitch(instance, pitch);
    },
  );
  const durationControl = createDurationControl();
  const tempoControl = createTempoControl(
    elements.tempoElement,
    (warpPercent) => durationControl.setWarp(warpPercent),
  );

  // Render sheet music SVG
  const scoreRender = renderScore(
    elements.scoreElement,
    abcText,
    (abcElement) => {
      if (instance) handleScoreClick(instance, abcElement);
    },
  );
  elements.scoreElement.addEventListener("pointerdown", resetScoreClickClaim, true);
  elements.scoreElement.addEventListener("click", handleScoreBackgroundClick);

  // Paper is laid out by someone else's rules; the sheet gets cut into pages
  // for the length of that job and put back the way the screen knows it.
  const stopPrintPagination = setupPrintPagination(elements.scoreElement);

  instance = {
    container: elements.container,
    scoreElement: elements.scoreElement,
    keyboard,
    audioElement: elements.audioElement,
    qualityElement: elements.qualityElement as ABCDeskQualityElement,
    tempoControl,
    durationControl,
    codeToggleElement: elements.codeToggleElement as ABCDeskCodeToggleElement,
    preElement,
    preElementOriginalDisplay: null,
    isCodeCollapsed: false,
    abcText,
    themeMode,
    visualObj: scoreRender.visualObj,
    renderedStaffWidth: scoreRender.staffWidth,
    synthControl: null,
    synthReady: null,
    activePlaybackElements: [],
    targetOffset: null,
    targetElements: [],
    scoreClickClaimed: false,
    scoreResizeObserver: null,
    scoreResizeTimer: undefined,
    pendingPlaybackSeekPercent: null,
    pendingPlaybackSeekPromise: null,
    progressDragCleanup: null,
    onSourceHighlight: options.onSourceHighlight,
    onSelectSourceRange: options.onSelectSourceRange,
    onTargetRanges: options.onTargetRanges,
    cleanup: () => {
      if (instance) {
        disposeScoreResizeObserver(instance);
        instance.progressDragCleanup?.();
        instance.progressDragCleanup = null;
      }
      elements.scoreElement.removeEventListener(
        "pointerdown",
        resetScoreClickClaim,
        true,
      );
      elements.scoreElement.removeEventListener(
        "click",
        handleScoreBackgroundClick,
      );
      keyboard.dispose();
      stopPrintPagination();
      elements.cleanup();
    },
  };

  updateQualityPanel(instance);
  applyCodeBlockVisibility(instance, codeBlockVisibility);
  applyKeyboardVisibility(instance, keyboardVisibility);
  setupKeyboard(instance);
  instances.set(preElement, instance);
  setupScoreResizeObserver(instance, () => rerenderScoreForLayout(instance));

  // Initialize synth (async, non-blocking)
  startSynth(instance);

  return instance;
}

/**
 * Kick off the synth and keep the promise it resolves with, so anything that
 * needs sound can wait for it instead of racing the soundfont.
 */
function startSynth(instance: RenderInstance): void {
  instance.synthReady = initSynth(instance);
}

function playKeyboardPitch(instance: RenderInstance, pitch: number): void {
  playLocalPianoPitch(pitch).catch((err: unknown) => {
    console.warn("[ABC Desk] Keyboard pitch playback failed:", err);
    // A silent key is the same missing sound the transport would hit, so it
    // earns the same sentence rather than only a console line.
    reportMissingSounds(instance.audioElement);
  });
}

/**
 * The tune's own name, for the host to put on the tab. A sheet that does not
 * parse has no name to offer, so the caller falls back to its own.
 */
export function getTuneTitle(instance: RenderInstance): string | null {
  return instance.visualObj?.[0]?.metaText?.title ?? null;
}

function applyKeyboardVisibility(
  instance: RenderInstance,
  keyboardVisibility: KeyboardVisibility,
): void {
  instance.keyboard.setVisible(keyboardVisibility === "visible");
}

export function updateKeyboardVisibility(
  keyboardVisibility: KeyboardVisibility,
): void {
  for (const instance of instances.values()) {
    applyKeyboardVisibility(instance, keyboardVisibility);
  }
}

function applyCodeBlockVisibility(
  instance: RenderInstance,
  codeBlockVisibility: CodeBlockVisibility,
): void {
  setCodeCollapsed(instance, codeBlockVisibility === "collapsed");
}

function setCodeCollapsed(
  instance: RenderInstance,
  isCollapsed: boolean,
): void {
  if (!(instance.preElement instanceof HTMLElement)) return;

  if (instance.preElementOriginalDisplay === null) {
    instance.preElementOriginalDisplay = instance.preElement.style.display;
  }

  instance.isCodeCollapsed = isCollapsed;
  instance.preElement.style.display = isCollapsed
    ? "none"
    : instance.preElementOriginalDisplay;
  instance.codeToggleElement.setCollapsed(isCollapsed);
}

export function updateCodeBlockVisibility(
  codeBlockVisibility: CodeBlockVisibility,
): void {
  for (const instance of instances.values()) {
    applyCodeBlockVisibility(instance, codeBlockVisibility);
  }
}

/**
 * Update an existing render with new ABC text.
 */
function updateRender(
  instance: RenderInstance,
  abcText: string,
  themeMode: ThemeMode,
): RenderInstance {
  applyTheme(instance, themeMode);
  clearPlaybackHighlight(instance);
  // The offsets belonged to the old text: the workspace points again once this
  // render lands, so anything kept here would only be a memory of a lost note.
  clearTarget(instance);

  // Re-render SVG
  const scoreRender = renderScore(
    instance.scoreElement,
    abcText,
    (abcElement) => {
      handleScoreClick(instance, abcElement);
    },
  );

  instance.abcText = abcText;
  instance.visualObj = scoreRender.visualObj;
  instance.renderedStaffWidth = scoreRender.staffWidth;
  setupKeyboard(instance);
  updateQualityPanel(instance);

  // Re-initialize synth with new tune
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  instance.synthReady = null;
  startSynth(instance);

  return instance;
}

function rerenderScoreForLayout(instance: RenderInstance): void {
  if (!shouldRerenderScoreForLayout(instance)) return;

  clearPlaybackHighlight(instance);
  const scoreRender = renderScore(
    instance.scoreElement,
    instance.abcText,
    (abcElement) => {
      handleScoreClick(instance, abcElement);
    },
  );
  instance.visualObj = scoreRender.visualObj;
  instance.renderedStaffWidth = scoreRender.staffWidth;
  setupKeyboard(instance);

  // The old boxes died with the old SVG, but the text did not change: point at
  // the same offset again so a resize does not erase the reader's place.
  if (instance.targetOffset !== null) {
    pointSourceOffset(instance, instance.targetOffset);
  }

  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
    startSynth(instance);
  }
}

function applyTheme(instance: RenderInstance, themeMode: ThemeMode): void {
  instance.themeMode = themeMode;
  applyRenderViewTheme(instance.container, instance.preElement, themeMode);
}

export function updateRenderThemes(themeMode: ThemeMode): void {
  for (const instance of instances.values()) {
    applyTheme(instance, themeMode);
  }
}

/**
 * Remove a render instance and its DOM elements.
 */
export function removeRender(preElement: Element): void {
  const instance = instances.get(preElement);
  if (instance) {
    disposeRender(preElement, instance, preElement.isConnected);
  }
}

export function removeDisconnectedRenders(): void {
  for (const [preElement, instance] of instances) {
    if (!preElement.isConnected || !instance.container.isConnected) {
      disposeRender(preElement, instance, preElement.isConnected);
    }
  }
}

export function removeOrphanRenders(): void {
  const activeContainers = new Set(
    [...instances.values()].map((instance) => instance.container),
  );

  for (const container of document.querySelectorAll(".abcdesk-host")) {
    if (
      !(container instanceof HTMLElement) ||
      activeContainers.has(container)
    ) {
      continue;
    }

    const sourceElement = container.previousElementSibling;
    if (
      sourceElement instanceof HTMLElement &&
      sourceElement.style.display === "none"
    ) {
      sourceElement.style.display = "";
    }
    container.remove();
  }
}

export function removeAllRenders(): void {
  for (const [preElement, instance] of instances) {
    disposeRender(preElement, instance, preElement.isConnected);
  }
  removeOrphanRenders();
}

function disposeRender(
  preElement: Element,
  instance: RenderInstance,
  restoreCodeDisplay: boolean,
): void {
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  clearPlaybackHighlight(instance);
  if (restoreCodeDisplay) setCodeCollapsed(instance, false);
  instance.cleanup();
  instance.container.remove();
  instances.delete(preElement);
}

/**
 * Check if a <pre> element already has a ABC Desk render.
 */
export function hasRender(preElement: Element): boolean {
  return instances.has(preElement);
}
