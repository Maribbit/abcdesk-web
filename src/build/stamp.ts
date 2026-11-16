import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** What the About sheet names: the release, the tree it was built from, and the day. */
export interface BuildStamp {
  version: string;
  commit: string;
  date: string;
}

/**
 * The build's own name, read once when the config loads — the version is the
 * release in `package.json`, and the commit is the tree the page was built
 * from. A page nobody installs is never one release and one file: two readers
 * on the same version can be running different code, so the commit is the half
 * that actually identifies a build. A copy without a repository (a tarball, an
 * unpacked archive) has no commit to name and says `dev` rather than borrowing
 * the last one it saw.
 *
 * The date is the build's own day, not the commit's: a hosted page is deployed
 * when it is pushed, and the reader asking when this build went up wants that
 * day rather than the day someone last edited a file.
 */
export function readBuildStamp(root: URL, now: Date = new Date()): BuildStamp {
  // `href` rather than the URL object: the file helpers want a path, and a
  // browser-shaped test environment hands them a URL of its own kind.
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL("package.json", root).href), "utf8"),
  ) as { version?: string };

  return {
    version: manifest.version ?? "0.0.0",
    commit: readCommit(fileURLToPath(root.href)),
    date: localIsoDate(now),
  };
}

/** `2026-11-16` on the machine that built it, not the UTC day next door. */
function localIsoDate(now: Date): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function readCommit(directory: string): string {
  try {
    const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return commit || "dev";
  } catch {
    return "dev";
  }
}

/**
 * Vite replaces these three names wherever the bundle reads them;
 * `src/workspace/version.ts` is the only reader. The JSON form is what keeps a
 * value with a quote in it from breaking the bundle.
 */
export function buildStampDefines(stamp: BuildStamp): Record<string, string> {
  return {
    __APP_VERSION__: JSON.stringify(stamp.version),
    __BUILD_COMMIT__: JSON.stringify(stamp.commit),
    __BUILD_DATE__: JSON.stringify(stamp.date),
  };
}
