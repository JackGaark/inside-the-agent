# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm (Vite is the only dependency).

- `pnpm dev` — start the Vite dev server
- `pnpm build` — production build into `dist/` (gitignored)
- There is no test runner or linter (`pnpm test` is the npm placeholder and fails).

## Architecture

A single-page interactive explainer ("Inside the Agent", based on a talk by Sabrina Goldfarb) with 13 scenes plus a recap. Everything runs client-side; there is no backend and no framework.

- `index.html` — all markup. Each scene is a `<section class="scene wrap" id="s-<name>" data-label="NN Title">`. The `data-label` drives the fixed bottom chapter nav. Controls and outputs are wired by element id with a per-scene prefix (e.g. `#a-run`, `#t-verdict`, `#k-meter`).
- `src/main.js` — one IIFE, imported by `index.html` as a module. Code is organised in `/* ===== NN NAME ===== */` blocks, one per scene, in the same order as the HTML. It starts with shared helpers (`$`/`$$`, `presetGroup`, `toggle`, `stepper`, `axis`, `logLine`, `sv` for SVG, `buildDiagram` for node/edge diagrams) used by every scene.
- `src/style.css` — design tokens on `:root` (GT Mechanik design-system colors/spacing, light theme only), a 12-column grid (6 below 768px), then component classes (`.preset`, `.panel`, `.verdict`, `.glyph`, `.node`, etc.).

### Conventions to preserve

- Adding a scene means editing three places in step: a new `<section>` in `index.html` with a unique id prefix, a matching block in `main.js`, and any styles in `style.css`.
- Async demos (step-by-step traces/animations) use the run-token pattern: `const t=begin('key')` at the start and `if(!alive('key',t))return` after every `await wait(...)`, so re-clicking Run cancels the previous run. `wait` is shortened automatically under `prefers-reduced-motion`.
- Demo content (tool calls, docs, token counts, etc.) is hard-coded sample data at the top of each scene block; it is illustrative, not fetched.
- The existing code is deliberately dense (long one-line functions, minimal comments). Match that style when editing nearby code.
- Fonts (IBM Plex Mono, Inter) load from Google Fonts in `index.html`.
