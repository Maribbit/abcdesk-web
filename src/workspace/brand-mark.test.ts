import { describe, expect, it } from "vitest";
import html from "./index.html?raw";
import mark from "../../public/icons/icon.svg?raw";
import installIcon from "../../scripts/icon-app.svg?raw";

/**
 * The note is drawn four times: in the masthead (an <img> cannot take the
 * accent, so it is inline there), in the tab's `icon.svg`, on the install
 * icon's sheet of paper, and once more on the About portrait's head, where the
 * character from the blog wears it. One drawing, four copies — the points are
 * read out of all four here, because a masthead note that has quietly moved on
 * from the tab's is the kind of difference nobody sees until the two sit side
 * by side.
 */
function points(source: string): string[] {
  return [...source.matchAll(/points="([^"]+)"/g)].map(([, value]) =>
    value.split(/\s+/).filter(Boolean).join(" "),
  );
}

/** The masthead draws other figures too; only the branded one is the mark. */
function mastheadMark(source: string): string {
  return source.match(/<svg class="workspace-brand-mark"[\s\S]*?<\/svg>/)?.[0] ?? "";
}

/** The About portrait wears the same mark, scaled to sit on her hair. */
function portraitMark(source: string): string {
  return source.match(/<g class="dialog-portrait-mark"[\s\S]*?<\/g>/)?.[0] ?? "";
}

describe("Brand mark", () => {
  it("draws the same three polygons in the masthead, the tab and the install icon", () => {
    const drawing = points(mark);
    expect(drawing).toHaveLength(3);
    expect(points(mastheadMark(html))).toEqual(drawing);
    expect(points(installIcon)).toEqual(drawing);
  });

  it("is worn on the About portrait's head, unchanged", () => {
    expect(points(portraitMark(html))).toEqual(points(mark));
  });

  it("stands on nothing of its own", () => {
    // What it replaced was a rounded tile with a gradient and a drop shadow. The
    // mark is now the blog's furniture: flat, faceted, and with no plate behind
    // the glyph. The install icon is the one exception, and it says so — its
    // single rect is the paper a home screen has to be given.
    expect(mark).not.toContain("<rect");
    expect(mark).not.toContain("Gradient");
    expect(mark).not.toContain("<filter");
    expect(mark).not.toContain("border-radius");
    expect(installIcon.match(/<rect/g)).toHaveLength(1);
  });
});
