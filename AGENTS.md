# AGENTS.md

Rules for any agent working in this repository.

## Run

- `npm run dev` starts the server with the built-in fake model; no download. `npm start` loads the real QVAC model.
- `npm test` runs every suite under `test/` on Bare. Suites register with `test/harness.js`; add a new file to `SUITES` in `test/run.js`.
- Use `VAULT_DATA_DIR` for any throwaway run so `./data` is never touched.

## Invariants

- The password never reaches the browser. Public endpoints return guarded replies, booleans and counts only.
- Fully offline: no CDN, no remote fonts, no network calls from the page. Everything the browser loads comes from `public/`.
- No build step. Plain HTML, CSS and JavaScript in `public/`, plain ES modules in `src/`.
- Every level passes through `normalizeLevel` in `src/levels.js`; new level fields get a default there.

## Tests

- Test first. Name every literal in a test that carries meaning.
- Tests use `VAULT_DATA_DIR` fixtures set by `test/run.js`, never live data.

## Design

- `PRODUCT.md` holds product truth and `DESIGN.md` the visual system. Read both before touching `public/`.
- Colour and type come from `public/tokens.css`. Ember (`--ember`) is reserved for the live tumbler and a ward that fired.

## Changes

- Every change goes through a pull request.
- Commit messages say what changed and why, in the imperative.
