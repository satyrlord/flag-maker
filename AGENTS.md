# AGENTS.md — Canonical Project Reference

This file is the single source of truth shared by all AI coding agents working in this
repository. Each agent has its own thin wrapper (`CLAUDE.md`, `.github/copilot-instructions.md`)
that may add agent-specific tooling notes, but all project knowledge lives here.

---

## Project Overview

Flag Maker is a precision flag construction tool for pixel-perfect reproduction of
real-world flags. It supports adjustable stripes, overlays (rectangles, circles, stars,
national emblems), drag/edit, and SVG/PNG export. The goal is to rival professional
tools while remaining free and open-source.

This is a fork of [mohadian/flag-maker](https://github.com/mohadian/flag-maker) being
evolved into a modern, feature-rich, free and open-source flag design tool.

**Core constraint:** Every feature exists to help users recreate actual national,
historical, and organizational flags with exact proportions, colors, and layouts. This
is not a freeform drawing tool. Every contribution should push toward more accurate,
faithful reproductions and a more capable flag-making experience.

---

## Tech Stack

- **Language:** TypeScript (`strict: true`, ES2020, DOM libs)
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss` plugin + autoprefixer)
- **UI approach:** No framework; direct DOM manipulation with ES modules
- **Path alias:** `@/` -> `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Assets:** SVG emblems in `public/emblems/`, symbol catalog in `public/symbols.json`
- **Tooling:** Node/TypeScript (`tools/fetch-emblems.ts`) for Wikimedia emblem fetching,
  Node/TypeScript (`tools/fetch-symbols.ts`) for curated flag symbol fetching,
  Node (`tools/svg2symbols.mjs`) for SVG-to-symbol conversion

---

## Architecture

Domain logic is separated into pure TypeScript modules. The UI is built with direct DOM
manipulation (no framework).

**The UI rendering engine and the flag rendering engine must be fully separated** -- UI
layout, controls, and interaction code should never be entangled with flag SVG
construction logic.

1. **Flag SVG construction** lives in `flagRenderer.ts`, which takes a `FlagDesign` and
   returns an `SVGSVGElement` -- no knowledge of panels, buttons, or event handlers.
2. **UI code** (`ui/*.ts`) calls into the flag renderer but never constructs flag SVG
   elements directly.

### Module Responsibilities

| Module | Role |
| --- | --- |
| `src/types.ts` | Domain interfaces: `Overlay`, `FlagDesign`, `SymbolDef` |
| `src/geometry.ts` | Pure: viewBox math, stripe rect computation |
| `src/overlays.ts` | Pure: builder functions for each overlay shape |
| `src/symbols.ts` | Symbol registry -- imports from `src/config/symbols-config.json` |
| `src/symbolLoader.ts` | Runtime fetch/merge of `public/symbols.json` emblem catalog |
| `src/templates.ts` | Template factory functions for division, national, and state-level presets |
| `src/templateCatalog.ts` | Composes template groups from split JSON catalog files |
| `src/flagRenderer.ts` | `FlagDesign` -> `SVGSVGElement`; no UI knowledge |
| `src/main.ts` | Bootstrap, event wiring, state management; derives defaults from JSON config |
| `src/ui/leftbar.ts` | Flag editor sidebar; reads `leftbar-config.json` |
| `src/ui/topbar.ts` | Application settings bar |
| `src/ui/botbar.ts` | Zoom level floating controls |
| `src/ui/rightbar.ts` | Dynamic tools floating panel (contextual, draggable) |

`flagRenderer.ts` must never reference DOM panels, buttons, event names, or UI state.
`ui/*.ts` modules must never construct `<svg>`, `<rect>`, or `<path>` elements for the flag.

### Data Flow

```text
JSON configs --> TypeScript modules --> FlagDesign state --> flagRenderer --> SVG
      |                                       ^
      +-- UI panels (leftbar, etc.) -- CustomEvents --> main.ts (mutates state, calls redraw)
```

### Core Principle: No Hardcoded Flag Elements

All flag elements (shapes, symbols, templates, ratios, colors, constraints) must come
from JSON config files in `src/config/`. TypeScript defines *how* elements behave; JSON
defines *which* elements exist. See `docs/architecture.md`
for the full rules, config file catalog, element categories, and procedures for adding
new shapes, symbols, and templates.

### Coordinate System

- All overlay positions/sizes: **percent-based (0-100)** for resolution independence
- Canvas fixed `viewBox` width: **1200**; height derived from the selected aspect ratio

### Rendering Order

Stripes (lowest Z) -> overlay shapes -> symbols (highest Z). Within each group, array
order (first = bottom). `visible === false` overlays are skipped; `locked` is UI-only.

---

## UI Layout

Five sections in a fixed full-viewport layout (`100dvh x 100dvw`), no global scrolling:

```text
Topbar (z:60)     -- app name + global actions (theme toggle, reset, export)
Leftbar (z:40)    -- flag editor: ratio selector, stripe controls, overlays, templates, symbols
Canvas            -- flag SVG centered; neutral background (#2a2a2a dark / #d0d0d0 light)
Botbar (z:50)     -- floating zoom controls (centered below flag)
Rightbar (z:45)   -- floating dynamic tools (right edge, draggable)
```

On UI changes, always follow `docs/ui-style-guide.md` for colors,
spacing, z-index, and interaction constraints.

---

## Theming

DaisyUI 5 with two custom themes defined in `src/index.css`:

- `flagmaker-dark` (default) -- base-100: `#2a2a2a`, primary: `#4a9eff`
- `flagmaker-light` -- base-100: `#d0d0d0`, primary: `#0066cc`

Theme switching sets both `data-theme="flagmaker-dark/light"` on `<html>` (DaisyUI) and
`class="dark/light"` (legacy CSS). New code should use DaisyUI semantic colors
(`bg-base-200`, `text-base-content`, etc.), not hardcoded hex values or the `dark:`
Tailwind prefix.

Tailwind v4 uses `@import "tailwindcss"` in CSS, not the v3 `@tailwind` directives.

---

## Responsive Design

- The UI must be **fully responsive** and fit the screen on both desktop and mobile.
- **Landscape only:** Portrait orientation is out of scope. Most real-world flags are
  wider than tall; portrait would make everything too small.
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) to adapt layouts across breakpoints.
- Panels should collapse or reflow on small screens -- never cause horizontal overflow.
- The flag canvas should scale fluidly without requiring horizontal scrolling.
- Test layouts at common breakpoints: mobile (375px), tablet (768px), desktop (1280px+).

---

## Code Style & Conventions

- **No emoji:** Never use emoji characters in `.md` files, code comments, or UI strings.
  Use plain text and standard punctuation only.
- TypeScript strict mode. Define explicit types/interfaces for domain objects.
- No frameworks -- use direct DOM manipulation (`document.createElement`,
  `document.createElementNS` for SVG, `addEventListener`, etc.).
- ES modules with explicit imports/exports. `@/` path alias maps to `src/`.
- Tailwind utility classes for styling. DaisyUI component classes (`btn`, `navbar`,
  `select`, `menu`, `join`, `badge`, `alert`). No CSS modules or styled-components.
- Prefer descriptive variable and function names.
- Flag domain vocabulary: stripe, overlay, emblem, symbol, canton, fess, pale, bend,
  saltire, chevron.
- When adding new overlay shapes or symbol types, add builder functions to `overlays.ts`
  and rendering logic to the canvas module.
- Keep SVG output clean and spec-compliant.

---

## Development Direction

Every feature must serve the core vision of pixel-perfect flag reproduction. Priority areas:

- **Starfield overlay:** Dedicated overlay type for arranging multiple stars in precise
  patterns (grid, ring, arc, scatter). Needed for USA, EU, China, Australia, Brazil, etc.
- **UI modernization:** Topbar, leftbar, botbar, rightbar, layer panel, property inspector.
- **Template accuracy:** National and state-level templates must match official
  specifications exactly -- verified against the flag's official construction sheet.
- **New features to build toward:** gradient fills, pattern fills, text overlays,
  multi-flag projects, save/load (JSON), share URLs, grid/snap, alignment tools,
  group/ungroup overlays, copy/paste overlays, keyboard shortcuts.
- **Symbol library expansion:** More emblem categories, search/filter, favorites.
- **Accessibility:** Keyboard navigation, screen reader labels, contrast-safe UI colors.
- **Performance:** Lazy-load symbol catalog, virtualize long lists, optimize SVG rendering.

---

## Commands

```bash
npm install          # install dependencies (Node >= 20 required)
npm run dev          # Vite dev server on port 5173 (strictPort)
npm run build        # production build
npm run preview      # preview production build on port 5173

# Quality gates (run before every commit)
npm run quality      # typecheck + lint + markdown lint + vitest (with coverage)
npm run quality:full # quality + Playwright e2e (required for UI/rendering changes)

# Individual checks
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
npm run lint:md      # markdownlint-cli2 on all .md files
npm run test         # vitest run (unit + integration)
npm run test:coverage      # vitest with coverage (80% minimum per file enforced)
npm run test:e2e           # playwright headless (always headless, never headed)
npm run test:e2e:coverage  # playwright with Istanbul coverage collection

# Run a single vitest test file
npx vitest run tests/unit/flagRenderer.test.ts

# Tooling
npm run fetch-emblems   # download SVG emblems from Wikimedia to public/emblems/
npm run fetch-symbols   # fetch curated symbols, merge into src/config/symbols-config.json
```

**Fixed ports -- never change these:**

- `5173` -- manual dev/preview (`npm run dev`, `npm run preview`, `npm run serve`)
- `5174` -- Playwright e2e test server

Both use `strictPort: true` -- Vite will error instead of silently picking a different
port. Never start a second dev server; reuse the existing terminal.

---

## Agent Workflow Notes

These practices apply to all agents working in this repository:

- When testing or debugging the app, open it in the **VSCode Simple Browser** (built-in).
  Do not launch an external browser unless Simple Browser cannot reproduce the issue.
- Use **Chrome DevTools MCP** only when Simple Browser is insufficient (e.g., advanced
  performance profiling, network inspection, headed Playwright debugging).
- When running tests, prefer `npx vitest run <file>` for a single file to keep feedback
  fast, then run `npm run quality` before finishing.
- Run `npm run quality:full` when changes affect UI rendering, layout, or user interactions.
  Playwright tests must always run headless. Never pass `--headed` or `--ui` flags.
- Check the VSCode **Problems** tab for any remaining diagnostics after making changes.

---

## File Layout

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Entry point (DOM bootstrap) |
| `src/types.ts` | Domain types (`Overlay`, `SymbolDef`, `FlagDesign`, etc.) |
| `src/utils.ts` | Pure utilities (clamp, uid, starPath, download, svgToPng) |
| `src/geometry.ts` | Flag geometry (viewBox, stripe rect computation) |
| `src/overlays.ts` | Overlay builder functions (rect, poly, star, band) |
| `src/symbols.ts` | Built-in symbol definitions |
| `src/symbolLoader.ts` | Fetch and merge symbols from `symbols.json` |
| `src/templates.ts` | Division, national, and state-level template factories |
| `src/templateCatalog.ts` | Template catalog composition and validation |
| `src/vite-env.d.ts` | Vite client type declarations |
| `src/ui/topbar.ts` | Application settings bar (topbar) |
| `src/ui/leftbar.ts` | Flag editor sidebar (leftbar) |
| `src/ui/botbar.ts` | Zoom level floating bar (botbar) |
| `src/ui/rightbar.ts` | Dynamic tools floating bar (rightbar) |
| `src/index.css` | Tailwind CSS import |
| `public/symbols.json` | Generated symbol/emblem catalog |
| `public/emblems/` | Raw SVG emblem source files |
| `tools/fetch-emblems.ts` | Wikimedia Commons emblem downloader |
| `tools/fetch-symbols.ts` | Curated flag symbol fetcher |
| `tools/svg2symbols.mjs` | SVG -> symbols.json converter (SVGO + recolor) |

---

## Testing & Coverage

- **Unit/integration:** Vitest + jsdom. Tests in `tests/unit/` and `tests/integration/`.
- **E2e:** Playwright in `tests/e2e/`. Always headless -- never run headed.
  Two targets: desktop-headless (Chromium 1400x800) and mobile-android (Pixel 7
  landscape, 915x412).
- **Coverage:** 80% minimum per file (statements, branches, functions, lines) enforced
  in both Vitest and Playwright runs. Pure domain files (`geometry.ts`, `utils.ts`,
  `symbolLoader.ts`) are excluded from e2e coverage -- covered by Vitest instead.
- **E2e coverage pipeline:**
  1. `vite-plugin-istanbul` instruments the build when `E2E_COVERAGE=true`, exposing
     `window.__coverage__` collected by `tests/e2e/coverage-fixture.ts`.
  2. `monocart-coverage-reports` global teardown (`tests/e2e/coverage-teardown.ts`)
     merges Istanbul data into console-details + lcov reports in `coverage/e2e/`.

---

## Important Notes

- **SVG security:** Always sanitize user-provided or external SVG content to prevent XSS.
  The existing `innerHTML` usage for emblems is acceptable only because data comes from
  our own curated `symbols.json`.
- **Symbols.json schema:** Each entry has `id`, `name`, `category`, `viewBox`, and `svg`
  (inner SVG markup). The converter may also emit `sourceFile`. New symbols must follow
  this schema.
- **Recolor modes** in `svg2symbols.mjs`: `keep` (preserve original colors),
  `currentColor` (replace fills/strokes), `mono:#hex` (single-color override).
- **Tailwind v4:** Uses the new `@import "tailwindcss"` syntax in CSS, not v3 `@tailwind`
  directives.
- **Node >=20** required (see `package.json` engines).
- **Symbol system:** All symbols are imported from external sources (Wikimedia Commons,
  Wikipedia). Hand-crafted SVG path symbols should only be added by user request.

---

## Deployment

GitHub Pages at `https://satyrlord.github.io/flag-maker/`. Asset paths must be relative
(no absolute root paths) to support the `/flag-maker/` subpath.
