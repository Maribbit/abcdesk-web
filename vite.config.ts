import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import { buildServiceWorker } from "./src/pwa/build-service-worker.ts";

/**
 * Files the install keeps besides the bundle: the page's own furniture. They
 * carry no hash, so the build has to name them.
 */
const PUBLIC_SHELL_FILES = [
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
  "icons/icon192.png",
  "icons/icon512.png",
];

/** The sample set the player uses, relative to `public/`. */
const SOUNDFONT_DIRECTORY = "soundfonts/FluidR3_GM/acoustic_grand_piano-mp3";

/**
 * Emits `sw.js` with the file lists filled in. It runs after the bundle is
 * known and before anything is written, so the worker lists exactly the names
 * this build produces — a hand-written list would go stale on the first
 * content hash.
 *
 * The worker's version is the hash of that list: a build that changes nothing
 * the worker caches keeps its cache instead of replacing it.
 */
function serviceWorkerPlugin(): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "abcdesk:service-worker",
    apply: "build",
    configResolved(config) {
      resolved = config;
    },
    generateBundle(_options, bundle) {
      const base = resolved.base;
      const shellFiles = [
        ...new Set([
          base,
          ...Object.keys(bundle)
            .filter((fileName) => fileName !== "sw.js")
            .map((fileName) => `${base}${fileName}`),
          ...PUBLIC_SHELL_FILES.map((fileName) => `${base}${fileName}`),
        ]),
      ];

      const soundfontFiles = readdirSync(
        join(resolved.publicDir, SOUNDFONT_DIRECTORY),
      )
        .filter((fileName) => fileName.endsWith(".mp3"))
        .sort()
        .map((fileName) => `${base}${SOUNDFONT_DIRECTORY}/${fileName}`);

      const version = createHash("sha256")
        .update(shellFiles.join("\n"))
        .digest("hex")
        .slice(0, 12);

      const template = readFileSync(
        new URL("./src/pwa/service-worker.js", import.meta.url),
        "utf8",
      );

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: buildServiceWorker({
          template,
          base,
          shellFiles,
          soundfontFiles,
          version,
        }),
      });
    },
  };
}

// Workspace is the only build target. Set SITE_BASE when deploying under a subpath.
export default defineConfig({
  root: "src/workspace",
  publicDir: "../../public",
  base: process.env.SITE_BASE ?? "/",
  plugins: [serviceWorkerPlugin()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
});
