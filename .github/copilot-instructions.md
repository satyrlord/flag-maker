# Flag Maker — Copilot Instructions

## Project Purpose

This is a fork of [mohadian/flag-maker](https://github.com/mohadian/flag-maker) being evolved into a modern, feature-rich, free and open-source flag design tool. The goal is to rival professional tools like [Flag Creator](https://flag-creator.com/) while remaining entirely free and community-driven. Every contribution should push toward a more polished, capable, and fun flag-making experience.

## Tech Stack

- **Language:** TypeScript (`strict: true`, ES2020, DOM libs)
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss` plugin + autoprefixer)
- **UI approach:** No framework; direct DOM manipulation with ES modules
- **Path alias:** `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Assets:** SVG emblems in `public/emblems/`, symbol catalog in `public/symbols.json`
- **Tooling:** Python (`tools/fetch_emblems.py`) for Wikimedia emblem fetching, Node (`tools/svg2symbols.mjs`) for SVG-to-symbol conversion

## Architecture

Domain logic is separated into pure TypeScript modules. The UI is built with direct DOM manipulation (no framework).

**The UI rendering engine and the flag rendering engine must be fully separated** — UI layout, controls, and interaction code should never be entangled with flag SVG construction logic. This ensures UI changes (e.g., redesigning panels, adding mobile layouts) can be made without touching flag rendering, and vice versa.

1. **Flag SVG construction** (building `<svg>`, `<rect>`, `<circle>`, `<path>`, `<g>` elements for the flag) should live in a dedicated rendering module (e.g., `flagRenderer.ts`) that takes a `FlagDesign` and returns an SVG element or string — no knowledge of panels, buttons, or event handlers.
2. **UI code** (panels, leftbar, property inspectors, drag handlers) should call into the flag renderer but never construct flag SVG elements directly.

### Key architectural facts

- **Module structure:** Types (`types.ts`), utilities (`utils.ts`), geometry (`geometry.ts`), overlay builders (`overlays.ts`), symbol data (`symbols.ts`), symbol loading (`symbolLoader.ts`), templates (`templates.ts`), entry point (`main.ts`).
- **Coordinate system:** Percent-based (0–100%) for resolution independence. Canvas uses a fixed `viewBox` width of 1200; height is derived from the selected aspect ratio.
- **Overlay model:** Each overlay (`rect`, `circle`, `star`, `path`, `symbol`) has position/size in `%`, plus fill/stroke/opacity/rotation. Overlays support lock, z-order, and drag repositioning.
- **Symbol system:** Built-in symbols (stars, crescents, crosses) plus loaded emblems from `symbols.json` (national coats of arms/emblems with full inner SVG markup and viewBox). Users can also import custom symbol JSON.
- **Template system:** Heraldic division templates (Per Pale, Per Fess, Per Bend, Saltire, Chevron, Nordic Cross, etc.) and national flag presets.
- **History:** Undo/redo (planned -- not yet implemented).
- **Export:** SVG download and SVG-to-PNG via canvas rasterization.
- **Emblem rendering:** Uses `innerHTML` for complex SVG emblem markup — be cautious and sanitize any user-provided SVG content.

## Responsive Design

- The UI must be **fully responsive** and fit the screen on both desktop and mobile devices.
- **Landscape only:** Only landscape orientation is supported on mobile/tablet. Most real-world flags are wider than tall, so the UI and flags would be too small in portrait mode. Portrait support is out of scope.
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) to adapt layouts across breakpoints.
- Panels (leftbar, botbar, rightbar, layer panel, property inspector) should collapse or reflow on small screens — never cause horizontal overflow.
- The flag canvas should scale fluidly to fill available space without requiring horizontal scrolling.
- Test layouts at common breakpoints: mobile (375px), tablet (768px), desktop (1280px+).

## Code Style & Conventions

- **No emoji:** Never use emoji characters in any documentation (`.md` files), code comments, or UI strings. Use plain text and standard punctuation only.
- Use TypeScript strict mode. Define explicit types/interfaces for domain objects (`Overlay`, `SymbolDef`, etc.).
- No frameworks — use direct DOM manipulation (`document.createElement`, `document.createElementNS` for SVG, `addEventListener`, etc.).
- Use ES modules with explicit imports/exports. Keep domain logic in pure functions separate from DOM code.
- Use Tailwind utility classes for styling. No CSS modules or styled-components.
- Prefer descriptive variable and function names. Flag domain terms: stripe, overlay, emblem, symbol, canton, fess, pale, bend, saltire, chevron.
- When adding new overlay shapes or symbol types, add builder functions to `overlays.ts` and rendering logic to the canvas module.
- Keep SVG output clean and spec-compliant — exported flags should open correctly in any SVG viewer or editor.
- **UI style guide:** When adding or modifying any UI element (layout, component, styling, theming, interaction behavior), always check and follow `.github/instructions/ui-style-guide.md` for colors, spacing, z-index, responsive behavior, and interaction constraints.

## Development Direction

This fork is actively adding features to match and exceed professional flag makers. Priority areas include:

- **UI modernization:** Build a proper UI with a topbar (application settings), leftbar (flag editor), botbar (zoom level), rightbar (dynamic tools), layer panel, property inspector, and canvas using direct DOM manipulation.
- **New features to build toward:** gradient fills, pattern fills, text overlays, multi-flag projects, save/load projects (JSON), share URLs, more templates, custom aspect ratios, grid/snap, alignment tools, group/ungroup overlays, copy/paste overlays, keyboard shortcuts.
- **Symbol library expansion:** More emblem categories (heraldic charges, geometric shapes, cultural symbols), search/filter, favorites.
- **Accessibility:** Keyboard navigation, screen reader labels, contrast-safe UI colors.
- **Performance:** Lazy-load the symbol catalog, virtualize long lists, optimize SVG rendering for complex emblems.

## Build & Run

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

Always start the dev server on a fixed port (`npm run dev` defaults to 5173) and
reuse that same port. Never launch a second dev server on a different port — if
a server is already running, reuse the existing terminal instead of starting
another one.

## Quality Gate

Two quality gate levels are available. Use the appropriate one:

```bash
npm run quality        # quick: typecheck + lint + markdown lint + vitest (with coverage)
npm run quality:full   # full: everything above + Playwright e2e tests
```

Individual commands:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src/
npm run lint:md        # markdownlint-cli2 on all .md files
npm run test           # vitest run (unit + integration)
npm run test:coverage  # vitest run --coverage (generates lcov report)
npm run test:e2e       # playwright e2e tests (headless only)
npm run test:e2e:coverage  # playwright e2e tests with coverage collection
```

Every change must pass `npm run quality` (the quick gate) before being
considered complete. Run `npm run quality:full` when changes affect UI
rendering, layout, or user interactions.

Also check the VSCode **Problems** tab for any remaining diagnostics.

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
| `src/templates.ts` | Division templates and national flag presets |
| `src/vite-env.d.ts` | Vite client type declarations (`/// <reference types="vite/client" />`) |
| `src/ui/topbar.ts` | Application settings bar (topbar) |
| `src/ui/leftbar.ts` | Flag editor sidebar (leftbar) |
| `src/ui/botbar.ts` | Zoom level floating bar (botbar) |
| `src/ui/rightbar.ts` | Dynamic tools floating bar (rightbar) |
| `src/index.css` | Tailwind CSS import |
| `public/symbols.json` | Generated symbol/emblem catalog |
| `public/emblems/` | Raw SVG emblem source files (193 files) |
| `tools/fetch_emblems.py` | Wikimedia Commons emblem downloader |
| `tools/svg2symbols.mjs` | SVG → symbols.json converter (SVGO + recolor) |

## Testing & Debugging

- When testing or debugging the app, open it in the **VSCode Simple Browser** (built-in). Do not launch an external browser unless the Simple Browser cannot reproduce the issue.
- Use `npm run dev` to start the Vite dev server, then open the local URL in the Simple Browser panel.
- **Unit & integration tests:** Vitest with jsdom environment. Tests live in `tests/unit/` and `tests/integration/`.
- **Code coverage:** `@vitest/coverage-v8` generates coverage reports. Run `npm run test:coverage` to see a text summary and produce an `lcov` report in `coverage/`. A minimum of **82% coverage is enforced per cell** (statements, branches, functions, lines) for every source file. The build will fail if any file drops below this threshold. This is configured in `vite.config.ts` under `test.coverage.thresholds`.
- **E2e regression tests:** Playwright tests live in `tests/e2e/`. They always run in **headless mode** -- no headed/UI mode is allowed (use Chrome DevTools MCP for headed debugging instead).
- **E2e code coverage:** Run `npm run test:e2e:coverage` to collect coverage during Playwright runs. The same **82% per-cell minimum** (statements, branches, functions, lines) applies per file in the e2e coverage report. Pure domain-logic files (`geometry.ts`, `utils.ts`) are excluded from e2e coverage because their functions are not exercisable through the UI -- they are fully covered by vitest unit tests instead. The e2e coverage pipeline uses two components:
  1. **Istanbul instrumentation** -- `vite-plugin-istanbul` instruments the build when `E2E_COVERAGE=true`, exposing `window.__coverage__` for the fixture (`tests/e2e/coverage-fixture.ts`) to collect after each test.
  2. **monocart-coverage-reports** -- Global teardown (`tests/e2e/coverage-teardown.ts`) merges Istanbul data into console-details + lcov reports in `coverage/e2e/`.
- **Playwright browser targets:** Tests run on exactly two projects:
  1. **desktop-headless** -- Playwright's built-in Chromium (headless), 1400x800 viewport.
  2. **mobile-android** -- Chromium emulating Pixel 7 in landscape (915x412 viewport), headless.
- **Fixed ports:** Two ports are hardcoded and must never change:
  - **5173** -- manual testing (`npm run dev`, `npm run preview`, `npm run serve`). Configured in `vite.config.ts` with `strictPort: true`.
  - **5174** -- e2e testing (Playwright webServer preview). Configured in `playwright.config.ts`.
  Never use any other port. Both use `strictPort: true` so Vite will error instead of silently picking a different port.

## Important Notes

- **SVG security:** When rendering user-provided or external SVG content, always sanitize to prevent XSS. The existing `dangerouslySetInnerHTML` usage for emblems is acceptable only because the data comes from our own curated `symbols.json`.
- **Symbols.json schema:** Each entry has `id`, `name`, `category`, `viewBox`, and `svg` (inner SVG markup). The converter may also emit `sourceFile`. New symbols must follow this schema.
- **Recolor modes** in `svg2symbols.mjs`: `keep` (preserve original colors), `currentColor` (replace fills/strokes with currentColor), `mono:#hex` (single-color override).
- **Tailwind v4:** Uses the new `@import "tailwindcss"` syntax in CSS, not the v3 `@tailwind` directives.
- **Node >=20** required (see `package.json` engines).

## Deployment Notes

- **Site target:** <https://satyrlord.github.io/flag-maker/>
