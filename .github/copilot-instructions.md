# Project Guidelines

## Architecture

- `src/studio/` owns the editor shell: DOM wiring, split layout, settings persistence, source actions and diagnostics rendering.
- `src/player/` owns reusable rendering, playback, controls and the Shadow DOM view. It must not know about Studio.
- `src/shared/` owns ABC file, quality, export, filename and asset helpers. Keep it free of DOM state.
- The studio is the only build target. A host-bridge seam stays isolated in `src/shared/extension-runtime.ts` (storage/messaging detection); never call host APIs from `src/player/` or `src/studio/`.

## Code Style

- TypeScript with the existing strict settings.
- Use ESLint only; do not add Prettier unless the project decides to adopt it.
- Style through CSS variables and the Shadow DOM stylesheets. Never compute colors in TypeScript.

## Workflow

- Start from `docs/specs/README.md`, pick the domain spec, then use its `代码与测试映射` to open only the needed source and test files.
- Moving code, adding tests or changing a boundary requires updating the matching spec map in the same change.
- Run `npm run check` before reporting completion. For narrower feedback use `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Conventional commit prefixes: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, `refactor:`.
- Update `CHANGELOG.md` for user-visible changes; keep unreleased work under `Unreleased`.
- Do not commit `dist/`, `node_modules/` or packaged archives.
- Do not tag releases or deploy without an explicit request.
