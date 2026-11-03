# Contributing

Keep changes small and reviewable.

## Workflow

1. `npm install`.
2. Pick the domain spec in [docs/specs/README.md](docs/specs/README.md) before touching code.
3. Make the smallest change that solves the problem, and add or update tests next to the code.
4. Run `npm run check` before committing.
5. Commit with a conventional prefix: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, `refactor:`.

## Code style

- TypeScript in strict mode, no `any` unless the boundary genuinely needs it.
- ESLint only. Do not add Prettier unless the project decides to adopt it.
- Keep the boundaries intact: `src/studio/` owns editor wiring, `src/player/` owns rendering and playback, `src/shared/` stays free of DOM state.
- Style the player through CSS variables and its Shadow DOM stylesheets, never by rewriting colors in TypeScript.
- Do not commit `dist/`, `node_modules/` or packaged archives.

## Tests

- Vitest, with jsdom for DOM-dependent modules.
- Put narrow tests next to the module as `*.test.ts`.
- When behavior changes, also update the `Code & Verification Map` in the matching spec.

## Changelog

Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes and keep unreleased work under `Unreleased`.
