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
- Keep the boundaries intact: `src/workspace/` owns editor wiring, `src/player/` owns rendering and playback, `src/shared/` stays free of DOM state.
- Style the player through CSS variables and its Shadow DOM stylesheets, never by rewriting colors in TypeScript.
- Do not commit `dist/`, `node_modules/` or packaged archives.

## Tests

- Vitest, with jsdom for DOM-dependent modules.
- Put narrow tests next to the module as `*.test.ts`.
- When behavior changes, also update the `Code & Verification Map` in the matching spec.

## Changelog

Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes and keep unreleased work under `Unreleased`.

## Releasing

The page deploys from `main`, so a release is a changelog section, a version and a tag — there is no artifact to publish.

1. Move `Unreleased` to a version and a date (`## [1.1.0] - 2026-12-01`), and leave an empty `Unreleased` above it.
2. Set the same version in `package.json`; About prints it beside the build's commit.
3. Run `npm run check`.
4. `git tag v1.1.0`, and push the commit together with the tag.

Pick the number by what a reader sees: a new thing or a changed behaviour is a minor, a fix is a patch. A major is only for a break in what the page keeps for them — the share-link hash or the `localStorage` keys — not for a busy week.

## License

The desk is released under [AGPL-3.0-or-later](LICENSE), and a pull request is taken as offered under the same terms — there is no separate agreement to sign. Two things in the repository are not the program and keep their own licences: the character on the About sheet ([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), non-commercial) and the bundled piano samples (CC BY 3.0, see [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt)).
