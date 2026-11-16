# ABC Desk Web

**ABC notation, anywhere.** One desk for a tune — source on one side, engraved score with playback and diagnostics on the other — in any browser, on any device, installed or offline, with no account, no server and nothing uploaded.

Live at **[abcdesk.maribbit.com](https://abcdesk.maribbit.com/)**. The web counterpart of the [ABC Desk](https://github.com/Maribbit/abcdesk) VS Code workbench, built on the same idea.

## What it does

- **Write and read in one place.** A CodeMirror editor with dimmed ABC syntax, line numbers and diagnostics under the text; a live engraved score beside it. The note under the caret and the note on the sheet are one selection, drawn in one blue.
- **Hear it while you read.** A bundled piano soundfont, so nothing is fetched and nothing waits on a network; the playhead follows the score, clicking a note starts there, and tempo, an 88-key view and play-from-caret are one keystroke away.
- **Keeps the tune.** The draft comes back on the next visit, `Copy Share Link` puts the whole tune in the URL hash without a server, and `.abc`, SVG and MIDI all export.
- **Works offline, and installs.** A service worker keeps the app shell and all 88 piano samples: the desk opens, edits and plays with no network at all, and says `Offline` while it has none.
- **Prints the paper, not the app.** `⌘P` / `Ctrl+P` gives the tune, its title and the directions above it on white; a tune longer than a page breaks between staff systems instead of through one.
- **Fits the device it is on.** Two panes, side by side or stacked, on a desk; below 600px a phone gets one-row bars, 44px targets and only the tools it can reach.

## Getting started

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview
```

A subpath deployment moves the bundle, not the address:

```sh
SITE_BASE=/workspace/ npm run build
```

`SITE_URL` is what link previews need: an absolute address for the social card and the `canonical` / `og:url` tags. It already defaults to `https://abcdesk.maribbit.com/`, so a plain `npm run build` prints the right address; set it when building a staging copy or a renamed site.

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

Everything runs in the browser. ABC source, rendered scores and preferences never leave the machine; there is no backend, no analytics and no remote font or soundfont request. The only stored data is the local preferences and the last edited source in `localStorage`, which About can take back with one button that asks twice.

## License

**GNU AGPL-3.0-or-later.** See [LICENSE](LICENSE). Run a modified copy of the desk for other people over a network and section 13 asks you to offer them its source — that is the reason for this licence rather than an accident.

Two things travel with the project under their own terms:

- The character in the About sheet is the author's blog artwork, [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): share and adapt it with credit, no commercial use.
- The bundled FluidR3_GM piano samples are [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/); see [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).

Copyright (c) 2026 Maribbit.
