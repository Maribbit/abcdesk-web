import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildStampDefines, readBuildStamp } from "./stamp";

// Vitest answers `import.meta.url` with the jsdom page's own address, so the
// repository is the working directory the suite runs from rather than anything
// derived from the module's URL.
const ROOT = pathToFileURL(`${process.cwd()}/`);

function release(): string {
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL("package.json", ROOT)), "utf8"),
  ) as { version: string };
  return manifest.version;
}

/** A copy of the sources with no repository around it: a tarball, an archive. */
function unpackedCopy(version: string): { directory: string; root: URL } {
  const directory = mkdtempSync(join(tmpdir(), "abcdesk-build-"));
  writeFileSync(join(directory, "package.json"), JSON.stringify({ version }));
  return { directory, root: pathToFileURL(`${directory}/`) };
}

describe("Build stamp", () => {
  const temporary: string[] = [];

  afterEach(() => {
    for (const directory of temporary.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("reads the release from the manifest and the commit from git", () => {
    const stamp = readBuildStamp(ROOT, new Date(2026, 10, 16, 10, 0));

    expect(stamp.version).toBe(release());
    // The repository this suite runs in has a commit, and its short form is
    // what the sheet prints.
    expect(stamp.commit).toMatch(/^[0-9a-f]{7,40}$/i);
    expect(stamp.date).toBe("2026-11-16");
  });

  it("says dev when there is no repository to name a commit from", () => {
    const copy = unpackedCopy("9.9.9");
    temporary.push(copy.directory);

    const stamp = readBuildStamp(copy.root, new Date(2026, 10, 16, 10, 0));

    expect(stamp.version).toBe("9.9.9");
    expect(stamp.commit).toBe("dev");
  });

  it("dates the build on the building machine's own day", () => {
    // Late enough that the UTC day is already tomorrow, early enough that it is
    // still today where the build ran: a night build keeps its own date.
    const stamp = readBuildStamp(ROOT, new Date(2026, 10, 16, 23, 30));

    expect(stamp.date).toBe("2026-11-16");
  });

  it("hands Vite the three names the bundle reads, quoted", () => {
    const defines = buildStampDefines({
      version: "1.0.0",
      commit: "dev",
      date: "2026-11-16",
    });

    expect(defines).toEqual({
      __APP_VERSION__: '"1.0.0"',
      __BUILD_COMMIT__: '"dev"',
      __BUILD_DATE__: '"2026-11-16"',
    });
  });
});
