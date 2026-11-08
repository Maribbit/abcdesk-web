/**
 * CodeMirror measures text and containers; jsdom has no layout, so the few
 * APIs it reaches for are stubbed here. Without them the editor throws on its
 * first measure pass — `isScrolledToBottom` checks `instanceof Window`, and
 * range rectangles come back undefined.
 */
const emptyRectList = () => ({ length: 0, item: () => null }) as DOMRectList;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = emptyRectList;
}

if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = emptyRectList;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
