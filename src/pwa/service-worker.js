/**
 * ABC Desk Web's service worker.
 *
 * This file is not bundled. The build reads it, replaces the four quoted
 * markers below with what it has just emitted, and writes the result to
 * `sw.js` — the app's own files carry content hashes that no source file can
 * know in advance, so the list is filled in at the one moment it is known.
 */

const BASE = "__BASE__";
const VERSION = "__VERSION__";
const SHELL_FILES = "__SHELL_FILES__";
const SOUNDFONT_FILES = "__SOUNDFONT_FILES__";

/**
 * The shell is versioned: each build keeps its own cache and activation drops
 * the previous one. The samples are not: 88 files that never change would be
 * downloaded again on every deploy, so they share one cache that outlives
 * builds and is only filled where it is still missing.
 */
const SHELL_CACHE = `abcdesk-shell-${VERSION}`;
const SOUNDFONT_CACHE = "abcdesk-soundfont-v1";

/**
 * The install's own fetches carry no `Origin`, so a server that answers them
 * with `Vary: Origin` — Vite's does for every asset, because the page asks for
 * its script and stylesheet with `crossorigin` — would leave cache lookups
 * missing exactly the files the app cannot start without. The cache belongs to
 * this app and holds one representation of each URL, so the header is ignored
 * rather than imitated.
 */
const CACHE_LOOKUP = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // The shell is all-or-nothing. A half-cached app opens offline into a
      // page whose script never arrives, which is worse than not opening.
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll(SHELL_FILES);

      // The samples are best-effort. A note that does not arrive now is
      // fetched on first use, and a missing sample must not fail the install.
      const soundfont = await caches.open(SOUNDFONT_CACHE);
      await Promise.allSettled(
        SOUNDFONT_FILES.map(async (url) => {
          if (await soundfont.match(url)) return;
          await soundfont.add(url);
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("abcdesk-shell-") && name !== SHELL_CACHE,
          )
          .map((name) => caches.delete(name)),
      );

      // The workspace is one page; there is no reason to make the reader
      // reload before this version can serve them.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(openPage(request));
    return;
  }

  event.respondWith(readFromCache(request, event));
});

/**
 * A page load goes to the network first, so a deploy is seen on the next
 * reload instead of whenever the cache happens to be dropped. Offline, the
 * workspace opens from the copy the install kept — and because the tune lives
 * in `localStorage`, it is still there with the network gone.
 */
async function openPage(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(BASE, {
      ...CACHE_LOOKUP,
      ignoreSearch: true,
    });
    return cached ?? Response.error();
  }
}

/**
 * Everything else is content-addressed (the bundles) or immutable (the
 * samples), so a cached copy is always the right copy: only a miss goes to
 * the network, and what comes back is kept for the next listen.
 */
async function readFromCache(request, event) {
  const cache = await caches.open(cacheNameFor(request.url));
  const cached = await cache.match(request, CACHE_LOOKUP);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) event.waitUntil(cache.put(request, response.clone()));
  return response;
}

function cacheNameFor(url) {
  return new URL(url).pathname.includes("/soundfonts/")
    ? SOUNDFONT_CACHE
    : SHELL_CACHE;
}
