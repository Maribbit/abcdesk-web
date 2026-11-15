import { afterEach, describe, expect, it } from "vitest";
import {
  computePrintBands,
  isScorePaginated,
  paginateScoreForPrint,
  restorePrintedScore,
} from "./print-pages";

const SVG_NS = "http://www.w3.org/2000/svg";

/** jsdom has no layout, so a box is something a test says it is. */
function stubBox(
  element: Element,
  top: number,
  height: number,
): Element {
  Object.defineProperty(element, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: top, width: 600, height }),
  });
  return element;
}

function createSheet({
  viewBox = "0 0 600 400",
  systems,
  withOrnaments = true,
}: {
  viewBox?: string;
  systems: Array<{ top: number; height: number }>;
  withOrnaments?: boolean;
}): HTMLElement {
  const score = document.createElement("div");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("style", "position: absolute");

  if (withOrnaments) {
    svg.append(document.createElementNS(SVG_NS, "style"));
    svg.append(document.createElementNS(SVG_NS, "title"));
  }

  const meta = document.createElementNS(SVG_NS, "g");
  meta.setAttribute("class", "abcjs-meta-top");
  svg.append(stubBox(meta, 10, 20));

  systems.forEach((system, index) => {
    const wrapper = document.createElementNS(SVG_NS, "g");
    wrapper.setAttribute("class", `abcjs-staff-wrapper abcjs-l${index}`);
    wrapper.setAttribute("data-system", String(index));
    svg.append(stubBox(wrapper, system.top, system.height));
  });

  score.append(svg);
  document.body.append(score);
  return score;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("computePrintBands", () => {
  it("breaks halfway between one system and the next", () => {
    const bands = computePrintBands(
      [
        { top: 100, bottom: 150 },
        { top: 200, bottom: 250 },
      ],
      0,
      400,
    );

    expect(bands).toEqual([
      { y: 0, height: 175 },
      { y: 175, height: 225 },
    ]);
  });

  it("gives a single system the whole page", () => {
    expect(
      computePrintBands([{ top: 100, bottom: 150 }], 0, 400),
    ).toEqual([{ y: 0, height: 400 }]);
  });

  it("keeps a sheet with no systems whole", () => {
    expect(computePrintBands([], 0, 400)).toEqual([{ y: 0, height: 400 }]);
  });

  it("clamps seams forward when systems overlap", () => {
    const bands = computePrintBands(
      [
        { top: 100, bottom: 220 },
        { top: 200, bottom: 260 },
      ],
      0,
      400,
    );

    expect(bands).toEqual([
      { y: 0, height: 210 },
      { y: 210, height: 190 },
    ]);
  });

  it("starts at the top of the content, not the first system", () => {
    const [first] = computePrintBands(
      [
        { top: 60, bottom: 90 },
        { top: 120, bottom: 150 },
      ],
      20,
      200,
    );

    expect(first).toEqual({ y: 20, height: 85 });
  });
});

describe("paginateScoreForPrint", () => {
  it("cuts the sheet into one page per staff system", () => {
    const score = createSheet({
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
        { top: 300, height: 50 },
      ],
    });

    expect(paginateScoreForPrint(score)).toBe(true);

    const pages = Array.from(
      score.querySelectorAll("[data-abcdesk-print-page]"),
    );
    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.getAttribute("viewBox"))).toEqual([
      "0 0 600 175",
      "0 175 600 100",
      "0 275 600 125",
    ]);
    expect(
      pages.map(
        (page) => page.querySelector("[data-system]")?.getAttribute("data-system"),
      ),
    ).toEqual(["0", "1", "2"]);
  });

  it("gives every page the screen's ink but not the screen's placement", () => {
    const score = createSheet({
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
      ],
    });
    paginateScoreForPrint(score);

    const page = score.querySelector("[data-abcdesk-print-page]");
    expect(page?.getAttribute("style")).toBeNull();
    expect(page?.querySelector("style")).not.toBeNull();
    expect(page?.querySelector("title")).not.toBeNull();
  });

  it("hides the whole sheet while the pages stand in for it", () => {
    const score = createSheet({
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
      ],
    });
    paginateScoreForPrint(score);

    expect(
      score.querySelector("svg")?.hasAttribute("data-abcdesk-print-hidden"),
    ).toBe(true);
  });

  it("does nothing twice", () => {
    const score = createSheet({
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
      ],
    });

    expect(paginateScoreForPrint(score)).toBe(true);
    expect(paginateScoreForPrint(score)).toBe(false);
    expect(score.querySelectorAll("[data-abcdesk-print-page]")).toHaveLength(2);
  });

  it("keeps ink that strayed above the sheet on the first page", () => {
    const score = createSheet({
      viewBox: "0 50 600 400",
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
      ],
    });
    paginateScoreForPrint(score);

    const pages = Array.from(
      score.querySelectorAll("[data-abcdesk-print-page]"),
    );
    // The meta block sits at 10–30, above a sheet that starts at 50.
    expect(
      pages[0].querySelector(".abcjs-meta-top"),
    ).not.toBeNull();
    expect(pages[1].querySelector(".abcjs-meta-top")).toBeNull();
  });

  it("leaves a sheet that already fits on one page alone", () => {
    const score = createSheet({ systems: [{ top: 100, height: 50 }] });

    expect(paginateScoreForPrint(score)).toBe(false);
    expect(isScorePaginated(score)).toBe(false);
  });

  it("leaves a sheet it cannot measure alone", () => {
    const score = document.createElement("div");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 600 400");
    for (const index of [0, 1]) {
      const wrapper = document.createElementNS(SVG_NS, "g");
      wrapper.setAttribute("class", `abcjs-staff-wrapper abcjs-l${index}`);
      svg.append(wrapper);
    }
    score.append(svg);
    document.body.append(score);

    expect(paginateScoreForPrint(score)).toBe(false);
  });
});

describe("restorePrintedScore", () => {
  it("puts the sheet back", () => {
    const score = createSheet({
      systems: [
        { top: 100, height: 50 },
        { top: 200, height: 50 },
      ],
    });
    paginateScoreForPrint(score);

    restorePrintedScore(score);

    expect(score.querySelectorAll("[data-abcdesk-print-page]")).toHaveLength(0);
    expect(score.querySelectorAll("[data-abcdesk-print-hidden]")).toHaveLength(0);
    expect(score.querySelectorAll("svg")).toHaveLength(1);
  });
});
