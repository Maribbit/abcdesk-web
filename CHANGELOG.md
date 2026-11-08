# Changelog

All notable changes to ABC Desk Web are documented in this file.

This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style.

## [Unreleased]

### Changed

- The project is renamed to **ABC Desk Web** (`abcdesk-web`), the web counterpart of the ABC Desk VS Code workbench. Branding, package name, storage keys, custom element tags and CSS custom properties move from `chatmusic` to `abcdesk`.
- The "Studio" concept is renamed to "workspace" so the app name, the code and the docs share one word: `src/studio/` becomes `src/workspace/`, `docs/specs/studio.md` becomes `workspace.md`, and the related settings helpers, storage keys, CSS classes and custom properties follow.
- The Chrome extension target has been removed. ABC Desk Web is now a web-only ABC editor: the content script, ABC detectors, popup, background worker and MV3 manifest are gone, and the last extension state is preserved at tag `extension-v0.4.0`.
- The build now produces a single static site in `dist/`. `npm run dev`, `npm run build` and `npm run check` all target the Studio app, and `SITE_BASE` replaces `CHATMUSIC_WEB_BASE` for subpath deployments.
- Refined Studio responsive layout: compact header breakpoint at 1000px (tighter gap/padding) and the Layout Mode control hides at 860px, where auto mode forces the stacked layout.
- Unified icon sizes across the Studio About dialog (18×18 → 15×15) and gave the tempo icon an unfilled circle stroke, matching the project-wide Lucide/Feather icon language.
- The source editor is now a CodeMirror 6 view instead of a textarea with a highlight mirror underneath. The mirror — a second copy of the text that had to be kept perfectly aligned with the first — is gone, and the workspace keeps talking to the editor through the `AbcEditor` facade.

### Added

- Added browser fullscreen toggle as a complement to system fullscreen, expanding the player to fill the browser viewport without hiding browser chrome.
- Added Escape key support to exit browser fullscreen mode.
- Added syntax greys to the source editor: fields, comments and bar lines are dimmed so the notes stay the darkest thing on the page, and the sounding note keeps the only saturated colour.
- Added diagnostics to the source text: the ranges the quality panel reports are underlined with a thin grey-blue wave, and clicking a panel item (or pressing Enter/Space on it) selects that range and scrolls it into view.
- Added score-to-source pointing: clicking a note in the score moves the source caret onto the characters that note was written with and scrolls them into view, without taking focus away from the score.
- Added play-from-cursor: `Mod-Enter` in the editor starts playback at the note under the caret, or at the next note when the caret sits between notes.
- Added a play-from-cursor button to the Source header, drawn as a play triangle with a text-cursor badge; its tooltip names the shortcut for the current platform.
- Added cursor-to-score following: moving the caret scrolls the staff line it belongs to into view, and a caret in the ABC header lines returns to the top of the sheet. Nothing is played, highlighted or focused.

### Removed

- Removed Chrome Web Store release tooling: extension packaging script, version sync check, store listing, release checklist and manual QA checklist.
- Removed the remaining extension-era docs (dual build, AI assistance guide, conversion notes, quality tooling plan) in favour of a four-domain spec set.

### Fixed

- Fixed disabled header buttons looking active: icon buttons in the Source pane now dim when they cannot run.
- Fixed the playback highlight staying on the score, the keybed and the source after pausing. abcjs reports start, notes and the end of the tune but not pause, so the last sounding note kept its blue until the tune finished; the pause path now clears it.
- Fixed note-click source highlight that skipped the last note before a bar line. When seeking to a clicked note's timing position, abcjs could fire the next event instead of the clicked one. The highlight is now fired directly after seeking so the correct note is always highlighted.

## [0.4.0] - 2026-05-31

### Added

- Added "About ABC Desk" info dialog in Studio, featuring author information and handy links to MusicXML web converters.
- Added a provider-based ABC detector architecture with DeepSeek and Gemini fixture coverage and detector contribution notes.
- Rendered ABC scores now automatically wrap systems to the available score pane width, improving readability for long generated or converted ABC sources.
- Studio now has a source editor line-wrap toggle for long ABC lines.
- Studio playback now highlights the corresponding ABC source range while notes play.
- Studio now links to external MusicXML/ABC conversion tools instead of running an incomplete built-in MusicXML converter.

### Changed

- Restructured Studio Editor into a VS Code-style tier layout with a slim status and diagnostic footer instead of interleaving error panels in the content flow.
- Refined Studio UI spacing with a compact main header and editor toolbar spacing.

### Removed

- Built-in MusicXML/MXL import was removed so ABC Desk can stay focused on reliable ABC editing, validation, rendering, playback, and export workflows.

### Fixed

- ABC parser warning panels in rendered score cards now render as complete block panels instead of fragmented inline borders, and long abcjs messages wrap inside the card.
- Popup detection toggles now apply immediately to the active tab, including pages that were open before the extension loaded or reloaded.
- Playback progress bars now seek continuously while dragging, including before the first playback starts.
- Studio source editor now uses a light code background in light mode instead of keeping the dark editor palette.
- Studio editor toolbar status text now progressively hides at narrow pane widths so the action buttons stay aligned without adding vertical space.
- Studio split panes now keep narrow editor contents clipped to the editor pane instead of letting the source area overlap the preview.
- Studio ABC source editor now fills the available pane height when the quality panel is hidden.
- Playback no longer starts an automatic full-piano soundfont warmup that could leave abcjs note caches in a failed state after transient sample-load errors.

## [0.3.0] - 2026-05-26

### Added

- Independent Studio workspace (`src/studio`) for pasting, validating, and rendering ABC notation directly, with support for offline web deployment.
- Virtual piano keyboard sound interaction (click-to-play) via built-in soundfont.
- "Open in Studio" integration from content-script rendered scores to seamlessly move AI-generated music to the standalone editor.
- MIDI export from rendered score controls in chats and Studio.
- ABC source file import and export in Studio.
- Automatic ABC source warning checks in Studio using abcjs parser warnings, with a toggle to turn auto-checking off.
- Automatic ABC parser warning feedback in rendered score previews, with copyable repair prompts for AI chats.
- MusicXML import in Studio for converting `.musicxml`, `.xml`, and compressed `.mxl` scores into ABC.

### Changed
- Web and extension dual-build architecture (`vite.web.config.ts`), allowing Studio to be hosted as a standalone website.

## [0.2.0] - 2026-05-14

### Added

- Popup theme mode control for automatic, light, and dark rendered score themes.
- Automatic rendered score theme detection based on the host page background.
- Fullscreen control for enlarging rendered scores during practice.
- Playback note highlighting and note click seeking in rendered scores.
- Playback piano keyboard visualization that highlights current MIDI pitches, with configurable default visibility.
- Tempo menu BPM readout based on the rendered ABC tune and current playback speed.
- Total playback duration display next to the audio progress clock.
- SVG score image export from the rendered score header.
- Bundled local piano soundfont samples for default playback without remote soundfont requests.
- Bounded embedded score scrolling for long tunes while keeping fullscreen controls visible.
- Source code collapse controls with configurable default visibility.
- Changelog and version consistency checks for release preparation.

### Changed

- Rendered scores use isolated theme styles inside the Shadow DOM.
- Rendered score controls use a compact header with fullscreen and tempo controls.
- Playback now defaults to a local piano soundfont and no longer needs the remote soundfont host permission.

## [0.1.0] - 2026-05-13

### Added

- Initial Chrome extension MVP for detecting ABC notation in page code blocks.
- abcjs sheet music rendering and playback controls.
- Popup setting for enabling or disabling detection.