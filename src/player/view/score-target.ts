import {
  findTimingEventAtCaret,
  getFirstNoteStart,
  getTimingEventRanges,
} from "../playback/cursor";
import { getTimingEventElementGroups } from "../playback/highlight";
import { syncPlayFromCursor } from "../playback/transport";
import { getTimingEvents } from "../playback/timing";
import type { RenderInstance, TimingEvent } from "../types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TARGET_CLASS = "abcdesk-target";
const BOX_CLASS = "abcdesk-target-box";
const LAYER_CLASS = "abcdesk-target-layer";
/** Breathing room between the box and the note, in screen pixels. */
const BOX_PADDING = 3;
const BOX_RADIUS = 3;

interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Point at the note standing at a source offset — the one shared selection of
 * the two panes.
 *
 * The caret and a click on the score both end up here, so "where I am in the
 * source" and "what I picked in the score" are the same state, drawn the same
 * way on both sides. Pointing stays passive: it never seeks, never highlights
 * and never takes focus.
 */
export function pointSourceOffset(
  instance: RenderInstance,
  offset: number,
): boolean {
  const events = getTimingEvents(instance);
  const firstNoteStart = getFirstNoteStart(events, instance.abcText);

  // The header lines (X, T, K …) describe the whole sheet rather than a note,
  // so a caret in them points at nothing and the sheet starts over.
  if (firstNoteStart !== null && offset < firstNoteStart) {
    clearTarget(instance);
    instance.scoreElement.scrollTop = 0;
    return false;
  }

  const event = findTimingEventAtCaret(events, instance.abcText, offset);
  if (!event) {
    clearTarget(instance);
    return false;
  }

  applyTarget(instance, offset, event);
  revealLine(event);
  return true;
}

/** Drop the mark and tell the other pane it is gone. */
export function clearTarget(instance: RenderInstance): void {
  clearTargetMarks(instance);
  instance.targetOffset = null;
  instance.onTargetRanges?.([]);
  syncPlayFromCursor(instance);
}

function applyTarget(
  instance: RenderInstance,
  offset: number,
  event: TimingEvent,
): void {
  clearTargetMarks(instance);
  instance.targetOffset = offset;

  const groups = getTimingEventElementGroups(event);
  for (const group of groups) {
    for (const element of group) element.classList.add(TARGET_CLASS);
  }
  instance.targetElements = groups.flat();

  drawBoxes(groups);
  // The keyboard is the third pane: the same note, in the same colour family.
  instance.keyboard.setPointedPitches(event.midiPitches ?? []);
  instance.onTargetRanges?.(getTimingEventRanges(event, instance.abcText));
  // There is a note to start from now, so the transport may offer it.
  syncPlayFromCursor(instance);
}

function clearTargetMarks(instance: RenderInstance): void {
  for (const element of instance.targetElements) {
    element.classList.remove(TARGET_CLASS);
  }
  instance.targetElements = [];

  for (const layer of instance.scoreElement.querySelectorAll(
    `.${LAYER_CLASS}`,
  )) {
    layer.replaceChildren();
  }

  instance.keyboard.clearPointedPitches();
}

/**
 * A note is a dot; a reader needs the line it sits on. abcjs wraps every music
 * line in `.abcjs-staff-wrapper`, and `nearest` keeps a visible line still.
 */
function revealLine(event: TimingEvent): void {
  const [group] = getTimingEventElementGroups(event);
  const [note] = group ?? [];
  if (!note) return;

  const line = note.closest(".abcjs-staff-wrapper") ?? note;
  line.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * Dashed boxes live inside abcjs's own SVG, not in a pixel overlay on top of
 * it: the score scales in CSS when the pane narrows, and user-space geometry
 * scales with it, so the box never drifts away from its note.
 */
function drawBoxes(groups: Element[][]): void {
  for (const group of groups) {
    const [first] = group;
    const svg = first instanceof SVGElement ? first.ownerSVGElement : null;
    if (!svg) continue;

    const bounds = unionScreenRect(group);
    if (!bounds) continue;

    getLayer(svg).append(createBox(svg, bounds));
  }
}

function createBox(svg: SVGSVGElement, bounds: ScreenRect): SVGRectElement {
  const frame = svg.getBoundingClientRect();
  const viewBox = svg.viewBox?.baseVal;
  const scaleX = scaleFactor(viewBox?.width, frame.width);
  const scaleY = scaleFactor(viewBox?.height, frame.height);
  const paddingX = BOX_PADDING * scaleX;
  const paddingY = BOX_PADDING * scaleY;

  const rect = document.createElementNS(SVG_NAMESPACE, "rect");
  rect.setAttribute("class", BOX_CLASS);
  rect.setAttribute(
    "x",
    String((viewBox?.x ?? 0) + (bounds.left - frame.left) * scaleX - paddingX),
  );
  rect.setAttribute(
    "y",
    String((viewBox?.y ?? 0) + (bounds.top - frame.top) * scaleY - paddingY),
  );
  rect.setAttribute(
    "width",
    String((bounds.right - bounds.left) * scaleX + paddingX * 2),
  );
  rect.setAttribute(
    "height",
    String((bounds.bottom - bounds.top) * scaleY + paddingY * 2),
  );
  rect.setAttribute("rx", String(BOX_RADIUS * Math.max(scaleX, scaleY)));
  return rect;
}

/** Screen pixels to user units; a missing viewBox is already 1:1. */
function scaleFactor(userUnits: number | undefined, pixels: number): number {
  if (!userUnits || !pixels || !Number.isFinite(userUnits / pixels)) return 1;
  return userUnits / pixels;
}

function unionScreenRect(elements: readonly Element[]): ScreenRect | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return Number.isFinite(left) ? { left, top, right, bottom } : null;
}

function getLayer(svg: SVGSVGElement): SVGGElement {
  for (const child of svg.children) {
    if (child.classList.contains(LAYER_CLASS)) return child as SVGGElement;
  }

  const layer = document.createElementNS(SVG_NAMESPACE, "g");
  layer.setAttribute("class", LAYER_CLASS);
  svg.append(layer);
  return layer;
}
