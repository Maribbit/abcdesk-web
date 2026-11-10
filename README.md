# ABC Desk Web

A browser-based ABC notation editor. Write ABC on the left, get an engraved score with playback, note highlighting and parser diagnostics on the right.

It is the web counterpart of **ABC Desk**, the VS Code workbench built on the same idea: one ABC workspace, so a score can be written in the editor and previewed on any device.

The project started as a Chrome extension that rendered ABC found in AI chat pages. That target was dropped in favour of a single, self-contained web app; the last extension state is kept at tag `extension-v0.4.0`.

## Features

- Live rendering with a 350 ms debounce, horizontal or stacked layout, draggable split and keyboard-resizable panes.
- Playback with a bundled FluidR3 piano soundfont, so it works offline and never requests remote samples.
- Installable and offline: a service worker keeps the app shell and every piano sample, so the workspace still opens, edits and plays with no network.
- Playback-driven source highlighting, click-to-seek on any note, tempo override, duration display and an 88-key keyboard view.
- abcjs parser warnings surfaced as a diagnostics panel instead of failing silently.
- `.abc` import and export, plus SVG and MIDI export.
- ABC source in the URL hash — compressed, with `Copy Share Link` — while theme, layout and editor preferences stay in `localStorage`.

## Getting started

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview
```

Deploying under a subpath:

```sh
SITE_BASE=/workspace/ npm run build
```

The service worker is only registered by a production build, so `npm run dev` is never served from a cache; `npm run preview` is where to try the offline copy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Build the static site into `dist/`. |
| `npm run preview` | Preview the production build. |
| `npm run lint` / `lint:fix` | ESLint. |
| `npm run typecheck` | TypeScript without emitting. |
| `npm run test` / `test:watch` | Vitest unit tests. |
| `npm run check` | Audit, lint, typecheck, tests and build. |

## Project layout

```text
src/workspace/   Workspace shell: DOM wiring, split layout, settings, source actions
src/player/   Reusable score rendering, playback, controls and Shadow DOM view
src/shared/   ABC file, quality, export and asset helpers shared by both
public/       Icons and bundled soundfont samples (copied into the build)
docs/specs/   Domain specs with code and test anchors
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Start new work from [docs/specs/README.md](docs/specs/README.md): pick the domain spec first, then jump into the source and test anchors it lists.

## Privacy

Everything runs in the browser. ABC source, rendered scores and preferences never leave the machine; there is no backend, no analytics and no remote font or soundfont request. The only stored data is the local preferences and the last edited source in `localStorage`, which you can clear from the browser.

Bundled soundfont attribution: [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).

## License

MIT. See [LICENSE](LICENSE).
