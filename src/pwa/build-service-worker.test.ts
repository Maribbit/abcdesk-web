import { describe, expect, it } from "vitest";
import {
  buildServiceWorker,
  normalizeServiceWorkerBase,
} from "./build-service-worker";

const TEMPLATE = [
  "const BASE = \"__BASE__\";",
  "const VERSION = \"__VERSION__\";",
  "const SHELL_FILES = \"__SHELL_FILES__\";",
  "const SOUNDFONT_FILES = \"__SOUNDFONT_FILES__\";",
].join("\n");

describe("service worker build", () => {
  it("fills every quoted marker and leaves no marker behind", () => {
    const source = buildServiceWorker({
      template: TEMPLATE,
      base: "/workspace/",
      shellFiles: ["/workspace/", "/workspace/assets/index-abc.js"],
      soundfontFiles: ["/workspace/soundfonts/C4.mp3"],
      version: "abc123",
    });

    expect(source).toContain('const BASE = "/workspace/";');
    expect(source).toContain('const VERSION = "abc123";');
    expect(source).toContain(
      '["/workspace/","/workspace/assets/index-abc.js"]',
    );
    expect(source).toContain('["/workspace/soundfonts/C4.mp3"]');
    expect(source).not.toMatch(/__[A-Z_]+__/);
  });

  it("treats a base written without slashes as the same deployment", () => {
    expect(normalizeServiceWorkerBase("workspace")).toBe("/workspace/");
    expect(normalizeServiceWorkerBase("/workspace")).toBe("/workspace/");
    expect(normalizeServiceWorkerBase("/workspace/")).toBe("/workspace/");
    expect(normalizeServiceWorkerBase("/")).toBe("/");
  });

  it("quotes file names as data instead of reading them as patterns", () => {
    const source = buildServiceWorker({
      template: TEMPLATE,
      base: "/",
      shellFiles: ["/a$&b.js"],
      soundfontFiles: [],
      version: "v",
    });

    expect(source).toContain('["/a$&b.js"]');
  });

  it("refuses a template it did not finish filling", () => {
    expect(() =>
      buildServiceWorker({
        template: "const X = __VERSION__;",
        base: "/",
        shellFiles: [],
        soundfontFiles: [],
        version: "v",
      }),
    ).toThrow(/__VERSION__/);
  });
});
