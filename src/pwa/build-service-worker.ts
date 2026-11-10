/**
 * Fills in the service worker's file lists at build time.
 *
 * The worker has to name the files it caches, and their names carry content
 * hashes, so the build is the only place that knows them. Keeping the
 * substitution here — away from Vite's plugin hooks — lets it be tested
 * without a build: the input is the template plus four lists, the output is
 * a plain string.
 */
export interface ServiceWorkerSource {
  template: string;
  /** Deployment base, with or without slashes; normalised on the way in. */
  base: string;
  /** Every file the app shell is made of, as URLs relative to the origin. */
  shellFiles: string[];
  /** Samples that make playback work offline. */
  soundfontFiles: string[];
  /** Changes whenever the shell does, so each build gets a new cache. */
  version: string;
}

export function buildServiceWorker({
  template,
  base,
  shellFiles,
  soundfontFiles,
  version,
}: ServiceWorkerSource): string {
  const replacements: [marker: string, value: unknown][] = [
    ["__BASE__", normalizeServiceWorkerBase(base)],
    ["__VERSION__", version],
    ["__SHELL_FILES__", shellFiles],
    ["__SOUNDFONT_FILES__", soundfontFiles],
  ];

  let source = template;
  for (const [marker, value] of replacements) {
    // split/join rather than a replace pattern: a URL list is data, and `$&`
    // inside one would otherwise be read as a back-reference.
    source = source.split(`"${marker}"`).join(JSON.stringify(value));
    if (source.includes(marker)) {
      throw new Error(`Service worker template still mentions ${marker}`);
    }
  }
  return source;
}

/**
 * `SITE_BASE` is written by hand in a shell, and `/workspace` and
 * `/workspace/` have to mean the same deployment: the worker adds file names
 * to the end of it.
 */
export function normalizeServiceWorkerBase(base: string): string {
  const absolute = base.startsWith("/") ? base : `/${base}`;
  return absolute.endsWith("/") ? absolute : `${absolute}/`;
}
