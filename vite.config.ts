import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import { absolutizeSocialMeta } from "./src/build/social-meta.ts";
import { buildServiceWorker } from "./src/pwa/build-service-worker.ts";

/**
 * Files the install keeps besides the bundle: the page's own furniture. They
 * carry no hash, so the build has to name them.
 */
const PUBLIC_SHELL_FILES = [
  "index.html",
  // `.json`, not the spec's `.webmanifest`: a static host that does not know
  // the extension serves it as `application/octet-stream`, and the manifest
  // is then a blob rather than a description of the app.
  "manifest.json",
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

/**
 * Where the workbench lives. It is a fact about the project, not about the
 * machine building it, so a build that forgets to pass `SITE_URL` still prints
 * the right address in its link preview; the variable stays for staging, a
 * rename, or a copy of the site under another name.
 */
const SITE_URL = process.env.SITE_URL ?? "https://abcdesk.maribbit.com/";

/**
 * A link preview wants an absolute card address, which only the deployment
 * knows. `SITE_URL` is that address (the one readers open).
 */
function socialMetaPlugin(): Plugin {
  return {
    name: "abcdesk:social-meta",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return absolutizeSocialMeta(html, SITE_URL);
      },
    },
  };
}

// Workspace is the only build target. `SITE_BASE` moves the bundle under a
// subpath; the address link previews print comes from `SITE_URL` above.
export default defineConfig({
  root: "src/workspace",
  publicDir: "../../public",
  base: process.env.SITE_BASE ?? "/",
  plugins: [serviceWorkerPlugin(), socialMetaPlugin()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
  },
});
