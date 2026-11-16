import { describe, expect, it } from "vitest";
import html from "./index.html?raw";
import {
  BUILD_STAMP,
  REPOSITORY_URL,
  buildCommitUrl,
  formatBuildDay,
  formatBuildStamp,
  renderBuildStamp,
} from "./version";

const RELEASE = { version: "1.0.0", commit: "4f2a1c3", date: "2026-11-16" };
const DEV_BUILD = { version: "1.0.0", commit: "dev", date: "2026-11-16" };

function mountSlot(): HTMLElement {
  const slot = document.createElement("span");
  slot.id = "dialogVersion";
  return slot;
}

describe("Build stamp", () => {
  it("names the release beside the commit it was built from", () => {
    expect(formatBuildStamp(RELEASE)).toBe("v1.0.0 · 4f2a1c3");
    expect(formatBuildStamp(DEV_BUILD)).toBe("v1.0.0 · dev");
  });

  it("links a real commit to its own page and nothing else", () => {
    expect(buildCommitUrl(RELEASE)).toBe(`${REPOSITORY_URL}/commit/4f2a1c3`);
    // A dev server and a tarball have no commit, so there is nothing to open.
    expect(buildCommitUrl(DEV_BUILD)).toBeNull();
    expect(buildCommitUrl({ ...RELEASE, commit: "unknown" })).toBeNull();
  });

  it("writes a build's day the way a person writes one", () => {
    expect(formatBuildDay("2026-11-16")).toBe("16 Nov 2026");
    expect(formatBuildDay("2026-01-05")).toBe("5 Jan 2026");
    expect(formatBuildDay("2026-13-01")).toBeNull();
    expect(formatBuildDay("2026-11-32")).toBeNull();
    expect(formatBuildDay("")).toBeNull();
  });

  it("fills the footer slot with a link and the build's day in its title", () => {
    const slot = mountSlot();

    renderBuildStamp(slot, RELEASE);

    const link = slot.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("v1.0.0 · 4f2a1c3");
    expect(link?.getAttribute("href")).toBe(`${REPOSITORY_URL}/commit/4f2a1c3`);
    // A link out of the page keeps no handle on the page behind it.
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.title).toBe("Built 16 Nov 2026");
  });

  it("says the same words without a link when there is no commit", () => {
    const slot = mountSlot();

    renderBuildStamp(slot, DEV_BUILD);

    expect(slot.querySelector("a")).toBeNull();
    expect(slot.textContent).toBe("v1.0.0 · dev");
    // A dev server is not a build: it gets no build date and no link.
    expect(slot.firstElementChild?.getAttribute("title")).toBeNull();
  });

  it("replaces what it wrote before rather than piling up", () => {
    const slot = mountSlot();

    renderBuildStamp(slot, RELEASE);
    renderBuildStamp(slot, DEV_BUILD);

    expect(slot.children).toHaveLength(1);
    expect(slot.textContent).toBe("v1.0.0 · dev");
  });

  it("keeps an empty slot in the markup for the build to fill", () => {
    expect(html).toContain('class="dialog-version" id="dialogVersion"');
    // The slot ships empty: a page cannot claim a release before it is built.
    expect(html).toContain('<span class="dialog-version" id="dialogVersion"></span>');
  });

  it("carries this repository's own release", () => {
    expect(BUILD_STAMP.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(BUILD_STAMP.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
