/**
 * Pagination for paper.
 *
 * The score is one tall SVG, and a page has no break opportunity inside it:
 * a tune that runs past a page is cut straight through a staff. Blocks break
 * where paper breaks, so before the sheet is laid out for printing we cut it
 * ourselves — every staff system is copied into its own SVG, cropped by its
 * own `viewBox` and told to keep out of page breaks. The browser then breaks
 * between systems, never through one.
 *
 * The screen keeps the single SVG it knows how to scroll: the copies live only
 * while a print job is being laid out, and `restorePrintedScore` puts back the
 * sheet the screen knows.
 */

const PAGE_ATTRIBUTE = "data-abcdesk-print-page";
const HIDDEN_ATTRIBUTE = "data-abcdesk-print-hidden";

/** The vertical extent of something on the sheet, in the SVG's own units. */
export interface VerticalBox {
  top: number;
  bottom: number;
}

export interface PrintBand {
  y: number;
  height: number;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Piece {
  child: Element;
  box: VerticalBox | null;
}

/**
 * Where the page may break: halfway between one system and the next.
 *
 * A midpoint keeps half the gap on either side of the seam, so a break never
 * eats into the staff above it and the next page keeps the air above its own.
 * Systems that overlap (a second voice, a crowded passage) give a seam behind
 * the previous one; it is clamped forward so no band can come out inverted.
 */
export function computePrintBands(
  systems: readonly VerticalBox[],
  contentTop: number,
  contentBottom: number,
): PrintBand[] {
  const ordered = [...systems].sort((a, b) => a.top - b.top);
  const firstTop = ordered[0]?.top ?? contentTop;
  const lastBottom = ordered[ordered.length - 1]?.bottom ?? contentBottom;
  const edges: number[] = [Math.min(contentTop, firstTop)];

  for (let index = 1; index < ordered.length; index += 1) {
    const seam = (ordered[index - 1].bottom + ordered[index].top) / 2;
    edges.push(Math.max(seam, edges[edges.length - 1]));
  }
  edges.push(Math.max(contentBottom, lastBottom));

  const bands: PrintBand[] = [];
  for (let index = 1; index < edges.length; index += 1) {
    const y = edges[index - 1];
    const height = edges[index] - y;
    if (height > 0) bands.push({ y, height });
  }
  return bands;
}

/**
 * Slice the sheet into one block per staff system. Returns whether the sheet
 * was actually cut — a tune that fits on one page, or a score whose geometry
 * cannot be measured yet, is left exactly as it was.
 */
export function paginateScoreForPrint(scoreElement: HTMLElement): boolean {
  if (isScorePaginated(scoreElement)) return false;

  const svg = scoreElement.querySelector("svg");
  if (!svg) return false;

  const viewBox = readViewBox(svg);
  if (!viewBox) return false;

  const pieces: Piece[] = Array.from(svg.children).map((child) => ({
    child,
    box: readBox(child),
  }));
  const systems = pieces
    .filter((piece) => piece.box !== null && isStaffSystem(piece.child))
    .map((piece) => piece.box as VerticalBox);

  // One system is already atomic: there is nothing to break between, and a
  // single system taller than a page cannot be helped from here.
  if (systems.length < 2) return false;

  const bands = computePrintBands(
    systems,
    viewBox.y,
    viewBox.y + viewBox.height,
  );
  if (bands.length < 2) return false;

  const pages = bands.map((band) => createPage(svg, viewBox, band));
  // `style` and `title` have no box: every page needs the first to be drawn at
  // all, and the second names the picture it is drawing.
  const ornaments = pieces.filter((piece) => piece.box === null);
  for (const piece of pieces) {
    if (!piece.box) continue;

    const center = (piece.box.top + piece.box.bottom) / 2;
    pages[findBandIndex(center, bands)].append(piece.child.cloneNode(true));
  }
  for (const page of pages) {
    for (const ornament of ornaments) page.append(ornament.child.cloneNode(true));
  }

  const fragment = document.createDocumentFragment();
  for (const page of pages) fragment.append(page);
  svg.after(fragment);
  svg.setAttribute(HIDDEN_ATTRIBUTE, "");

  return true;
}

/** Put the sheet back the way the screen drew it. */
export function restorePrintedScore(scoreElement: HTMLElement): void {
  for (const page of Array.from(
    scoreElement.querySelectorAll(`[${PAGE_ATTRIBUTE}]`),
  )) {
    page.remove();
  }
  for (const sheet of Array.from(
    scoreElement.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`),
  )) {
    sheet.removeAttribute(HIDDEN_ATTRIBUTE);
  }
}

export function isScorePaginated(scoreElement: HTMLElement): boolean {
  return scoreElement.querySelector(`[${PAGE_ATTRIBUTE}]`) !== null;
}

/**
 * Watch for printing and cut the sheet when it happens.
 *
 * `beforeprint` / `afterprint` are the promise; the media query is the belt —
 * a browser that lays the page out for print without announcing it still
 * changes the media, and one that announces twice is harmless because
 * paginating an already paginated sheet is a no-op.
 */
export function setupPrintPagination(scoreElement: HTMLElement): () => void {
  const before = (): void => {
    paginateScoreForPrint(scoreElement);
  };
  const after = (): void => {
    restorePrintedScore(scoreElement);
  };

  window.addEventListener("beforeprint", before);
  window.addEventListener("afterprint", after);

  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("print")
      : null;
  const onMediaChange = (event: MediaQueryListEvent): void => {
    if (event.matches) before();
    else after();
  };
  media?.addEventListener?.("change", onMediaChange);

  return () => {
    window.removeEventListener("beforeprint", before);
    window.removeEventListener("afterprint", after);
    media?.removeEventListener?.("change", onMediaChange);
    after();
  };
}

/**
 * The page a piece of ink belongs to: the band it sits in, or — for ink that
 * strayed past every band, as a crowded passage can — the nearest one.
 */
function findBandIndex(center: number, bands: readonly PrintBand[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  bands.forEach((band, index) => {
    const bottom = band.y + band.height;
    const distance =
      center < band.y ? band.y - center : center > bottom ? center - bottom : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function createPage(
  source: SVGSVGElement,
  viewBox: ViewBox,
  band: PrintBand,
): SVGSVGElement {
  // A shallow copy carries the namespace, the ink colours and the aspect rule;
  // the screen's placement and its accessible name stay with the whole sheet.
  const page = source.cloneNode(false) as SVGSVGElement;
  page.removeAttribute("style");
  page.removeAttribute("role");
  page.removeAttribute("aria-label");
  page.setAttribute(
    "viewBox",
    [viewBox.x, band.y, viewBox.width, band.height].join(" "),
  );
  page.setAttribute("preserveAspectRatio", "xMinYMin meet");
  page.setAttribute(PAGE_ATTRIBUTE, "");
  return page;
}

function isStaffSystem(element: Element): boolean {
  if (element.classList.contains("abcjs-staff-wrapper")) return true;
  // Matched by name too, so a page still cuts on the systems of a version
  // whose wrapper class drifted.
  return Array.from(element.classList).some((name) => /^abcjs-l\d+$/.test(name));
}

function readViewBox(svg: SVGSVGElement): ViewBox | null {
  const raw = svg.getAttribute("viewBox");
  if (!raw) return null;

  const values = raw.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || !values.every(Number.isFinite)) return null;

  const [x, y, width, height] = values;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function readBox(element: Element): VerticalBox | null {
  const graphics = element as SVGGraphicsElement;
  if (typeof graphics.getBBox !== "function") return null;

  try {
    const { y, height } = graphics.getBBox();
    if (!Number.isFinite(y) || !Number.isFinite(height) || height <= 0) {
      return null;
    }
    return { top: y, bottom: y + height };
  } catch {
    // Nothing measured yet, or nothing to measure: no box, no break line.
    return null;
  }
}
