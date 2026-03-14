# Development Architecture

This document defines the architectural rules and data-driven design
principles for the Flag Maker codebase. Every contributor and every
code-generation agent must follow these rules.

---

## Core Principle: No Hardcoded Flag Elements

**All flag elements -- including overlay types, symbols, templates,
colors, ratios, constraints, and any future element category -- must be
dynamic and must come from JSON configuration files.**

Nothing that defines *what* the user can place on a flag should be
hardcoded in TypeScript source. Source code defines *how* elements
behave; JSON defines *which* elements exist and their properties.

### What counts as a flag element

| Category | JSON source | Description |
| --- | --- | --- |
| Overlay shapes | `src/config/leftbar-config.json` (`overlayTypes`) | Rectangle, circle, star, and any future shapes |
| Symbols (built-in) | `src/config/symbols-config.json` + `src/config/symbols/metadata/*.json` + `src/config/symbols/svg/*.svg` -> `src/config/symbols-catalog.generated.json` | Imported symbols only (from Wikimedia/Wikipedia); no hand-crafted paths |
| Symbols (emblems) | `public/symbols.json` | National coats of arms, loaded at runtime |
| Templates | `src/config/template-division-config.json`, `src/config/national-division-config.json`, `src/config/substate-division-config.json`, plus `leftbar-config.json` (`templateGroups`) | Division patterns, national presets, state-level presets |
| Aspect ratios | `src/config/leftbar-config.json` (`ratios`) | All available H:W ratios |
| Default colors | `src/config/leftbar-config.json` (`stripes.defaultColors`) | Palette offered when adding stripes |
| Stripe constraints | `src/config/leftbar-config.json` (`stripes.minCount`, `maxCount`) | Min/max stripe count |
| Layer group constraints | A JSON config file | Min/max layers per group (stripes, overlays, symbols) |
| Grid sizes | `src/config/grid-config.json` | Available grid overlay sizes |
| Export sizes | `src/config/export-sizes.json` | PNG export resolution options |
| Default flag design | A JSON config file | Initial orientation, ratio, stripe count, colors |

### Rules

1. **Never hardcode element lists.** Adding a new overlay shape, symbol,
   template, or ratio must only require editing a JSON file -- not
   touching TypeScript source.
2. **Never hardcode default values** for flag state (colors, ratio,
   stripe count) in TypeScript. These belong in JSON config and must
   be imported/loaded at init.
3. **TypeScript defines behavior, JSON defines content.** The renderer
   knows *how* to draw a rectangle or star; JSON tells it *which*
   shapes are available to the user.
4. **Symbols must never be inline arrays.** Built-in symbol definitions
   (paths, generators, categories) must live in a JSON file, not in a
   TypeScript array literal. The `symbols.ts` module should import or
   load from JSON, not export a hardcoded `BUILTIN_SYMBOLS` array.
5. **Layer group constraints** (min/max layers for stripes, overlays,
   symbols) must come from JSON config, not from a `const` object in
   `types.ts`.
6. **Overlay type registries** in the renderer must be data-driven.
   If a new shape is added to the JSON overlay types list, the renderer
   should support it via a registered builder function -- not via a new
   `else if` branch in a monolithic function.

### Migration checklist (current violations to fix)

All previously identified violations have been resolved:

- `src/symbols.ts` -- `BUILTIN_SYMBOLS` now imports from
  `src/config/symbols-catalog.generated.json`, generated from the
  split symbol source tree declared in `src/config/symbols-config.json`.
- `src/types.ts` -- `LAYER_GROUP_CONSTRAINTS` now imports from
  `leftbar-config.json` `layerGroups`.
- `src/main.ts` -- `DEFAULT_DESIGN` now derives all values from
  `leftbar-config.json` (orientation, stripe count, colors, ratio).
- `src/types.ts` -- `UI_OVERLAY_TYPE_IDS` now derives from
  `leftbar-config.json` `overlayTypes`.
- `src/geometry.ts` -- `DEFAULT_RATIO` now derives from
  `leftbar-config.json` `defaultRatio`.

---

## Module Responsibilities

### Rendering vs. UI separation

The UI rendering engine and the flag rendering engine must be **fully
separated**:

| Concern | Module(s) | Allowed to... |
| --- | --- | --- |
| Flag SVG construction | `flagRenderer.ts` | Build SVG elements; read `FlagDesign`; access symbol registry |
| Flag SVG construction | `flagRenderer.ts` | **NOT** reference DOM panels, buttons, event names, or UI state |
| UI layout and controls | `ui/*.ts` | Build HTML panels; dispatch/listen events; call `emit()` |
| UI layout and controls | `ui/*.ts` | **NOT** create `<svg>`, `<rect>`, `<path>` for the flag |
| Wiring / orchestration | `main.ts` | Listen to UI events; mutate `FlagDesign`; call `redraw()` |

### Module map

| Module | Role | Data source |
| --- | --- | --- |
| `types.ts` | Domain interfaces (`Overlay`, `FlagDesign`, `SymbolDef`) | None (pure types) |
| `geometry.ts` | ViewBox math, stripe rect computation | None (pure functions) |
| `overlays.ts` | Builder functions for each overlay shape | None (pure factories) |
| `symbols.ts` | Symbol definition registry | **JSON config file** |
| `symbolLoader.ts` | Runtime fetch of emblem catalog | `public/symbols.json` |
| `templates.ts` | Template factory functions | Template catalog JSON for catalog; factory logic in TS |
| `templateCatalog.ts` | Template catalog composition and validation | Split template catalog JSON files + `leftbar-config.json` group order |
| `flagRenderer.ts` | `FlagDesign` to `SVGSVGElement` | Symbol registry (populated from JSON) |
| `main.ts` | App bootstrap, event wiring, state management | **JSON config** for defaults |
| `ui/leftbar.ts` | Flag editor sidebar | `leftbar-config.json` |
| `ui/topbar.ts` | App settings bar | None |
| `ui/botbar.ts` | Zoom controls | None |
| `ui/rightbar.ts` | Dynamic tools panel | Runtime state |

---

## Data Flow

```text
JSON configs ──> TypeScript modules ──> FlagDesign state ──> flagRenderer ──> SVG
     |                                       ^
     |                                       |
     └──> UI panels (leftbar, etc.) ── events ──> main.ts (mutates state, calls redraw)
```

1. At startup, config JSON files are imported/loaded.
2. UI panels are built from config data (available ratios, shapes,
   templates, symbols).
3. User interactions dispatch `CustomEvent`s that bubble up to `main.ts`.
4. `main.ts` mutates the `FlagDesign` object and calls `redraw()`.
5. `redraw()` calls `renderFlag(design)` which produces a fresh
   `SVGSVGElement` from the current design state.
6. Layer sync events push current state back to UI panels for display.

---

## Event Bus Conventions

- Events bubble upward via `{ bubbles: true }` from UI components.
- Downward communication uses direct `element.dispatchEvent()` on the
  target component (e.g. `leftbar.dispatchEvent(...)`) with
  `{ bubbles: false }`.
- Event names follow the pattern `component:action`
  (e.g. `toolbar:add-overlay`, `toolbar:layer-color`,
  `rightbar:sync-layers`).
- Event payloads are typed via `CustomEvent<T>` generics.

---

## Adding New Flag Elements

### Adding a new overlay shape

1. Add the shape entry to `overlayTypes` in `leftbar-config.json`.
2. Add a builder function in `overlays.ts`.
3. Register the builder in the renderer's shape dispatch (data-driven,
   not a new `else if`).
4. The UI picks it up automatically from config.

### Adding a new built-in symbol

1. Add or update the symbol metadata in the appropriate file under
  `src/config/symbols/metadata/`.
2. Add or update the SVG payload in `src/config/symbols/svg/`, or use a
  `path`/`generator` entry when appropriate.
3. Run `npm run build:symbols` to regenerate
  `src/config/symbols-catalog.generated.json`.
4. No TypeScript changes needed -- the loader reads the generated JSON.

### Adding a new template

1. Add the template entry to the appropriate catalog JSON file:
  `template-division-config.json`, `national-division-config.json`, or
  `substate-division-config.json`.
2. If needed, update `templateGroups` in `leftbar-config.json`.
3. Add a factory function in `templates.ts` and register it in the
  factory map used by `templateCatalog.ts`.

### Adding a new config dimension

1. Create a JSON file in `src/config/`.
2. Create a typed config loader module (like `gridConfig.ts`,
   `exportSizesConfig.ts`) that imports and validates the JSON.
3. Consumers import from the config module, never from the JSON
   directly.

---

## Config File Conventions

- All config files live in `src/config/` (build-time) or `public/`
  (runtime-loaded).
- Config files use flat, descriptive JSON structures with arrays of
  typed objects.
- Each config file should have a corresponding TypeScript validation
  module that checks shape and required fields at startup.
- Config schemas should be documented with TypeScript interfaces in
  the validation module.

---

## Coordinate System

- All overlay positions and sizes use **percent-based coordinates**
  (0--100) for resolution independence.
- The canvas uses a fixed `viewBox` width of 1200; height is derived
  from the selected aspect ratio.
- Stripe geometry is computed from section count, weights, orientation,
  and view height.

---

## Rendering Constraints

- Overlays render in layer group Z-order: stripes (lowest), then
  overlay shapes, then symbols (highest).
- Within each group, overlays render in array order (first = bottom).
- Overlays with `visible === false` are skipped during rendering.
- The `locked` property is UI-only and does not affect rendering.
- Symbol overlays with `sym.svg` (emblem markup) use `innerHTML` --
  only curated, trusted SVG from our own `symbols.json` is allowed.
  User-provided SVG must be sanitized.
- SVG output must be clean and spec-compliant -- exported flags must
  open correctly in any SVG viewer or editor.

---

## Tech Stack Constraints

- **Language:** TypeScript with `strict: true`, ES2020 target, DOM libs.
- **Build:** Vite 7.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss` plugin +
  autoprefixer. Uses the new `@import "tailwindcss"` syntax in CSS,
  not the v3 `@tailwind` directives.
- **Components:** DaisyUI 5, configured via `@plugin "daisyui"` in
  `src/index.css`. Provides semantic, theme-aware component classes
  (`btn`, `navbar`, `menu`, `select`, `join`, `badge`, `alert`, etc.)
  and two custom themes (`flagmaker-dark`, `flagmaker-light`). Theme
  switching uses `data-theme` on `<html>`. See the UI style guide for
  the full component mapping and color variable reference.
- **No framework.** Direct DOM manipulation with ES modules only.
  Use `document.createElement`, `document.createElementNS` for SVG,
  and `addEventListener`. No React, Vue, Svelte, or similar.
- **Path alias:** `@/` maps to `src/` (configured in both
  `vite.config.ts` and `tsconfig.json`).
- **Node >=20** required (see `package.json` engines).

---

## Code Style Rules

- **No emoji** in any `.md` files, code comments, or UI strings.
  Use plain text and standard punctuation only.
- Use ES modules with explicit imports/exports.
- Keep domain logic in pure functions separate from DOM code.
- Use Tailwind utility classes for styling. No CSS modules or
  styled-components.
- Prefer descriptive variable and function names. Flag domain terms:
  stripe, overlay, emblem, symbol, canton, fess, pale, bend, saltire,
  chevron.
- Follow Clean Code principles (Robert C. Martin).
- Define explicit types/interfaces for all domain objects (`Overlay`,
  `SymbolDef`, `FlagDesign`, etc.).

---

## Security Rules

- **SVG sanitization:** When rendering user-provided or external SVG
  content, always sanitize to prevent XSS. The `innerHTML` usage for
  emblems is acceptable only because data comes from our own curated
  `symbols.json`.
- **No hardcoded secrets.** Never commit API keys, tokens, or
  credentials.
- Follow OWASP Top 10 guidelines: no injection vectors, no
  unsanitized user input reaching the DOM or SVG output.

---

## Deployment and Asset Paths

- **Site target:** GitHub Pages at `/flag-maker/` subpath.
- **Asset paths must be relative** (no absolute root paths like
  `/assets/...`) to support the `/flag-maker/` deployment base.
- **Fixed ports** (never change these):
  - **5173** -- manual dev server (`npm run dev`, `npm run preview`).
    Configured with `strictPort: true` in `vite.config.ts`.
  - **5174** -- Playwright e2e test server. Configured with
    `strictPort: true` in `playwright.config.ts`.
  Never start a second dev server on a different port. If a server is
  already running, reuse the existing terminal.

---

## Testing Architecture

- **Unit and integration tests:** Vitest with jsdom environment.
  Tests in `tests/unit/` and `tests/integration/`.
- **E2e tests:** Playwright in `tests/e2e/`. Always headless -- no
  headed/UI mode.
- **Coverage:** Both vitest and Playwright enforce **80% minimum per
  cell** (statements, branches, functions, lines) for every source
  file. Coverage provider: `@vitest/coverage-v8` (vitest) and
  Istanbul via `vite-plugin-istanbul` (Playwright).
- **Playwright targets:** Exactly two projects:
  1. desktop-headless -- Chromium, 1400x800.
  2. mobile-android -- Chromium emulating Pixel 7 landscape, 915x412.
- **E2e coverage pipeline:**
  1. Istanbul instrumentation exposes `window.__coverage__`.
  2. `coverage-fixture.ts` collects after each test.
  3. `coverage-teardown.ts` merges via monocart-coverage-reports.
- Pure domain-logic files (`geometry.ts`, `utils.ts`) are excluded
  from e2e coverage -- fully covered by vitest instead.

---

## Quality Gate

Every change must pass `npm run quality` (typecheck + lint + markdown
lint + vitest with coverage) before being considered complete. Run
`npm run quality:full` (adds Playwright e2e) when changes affect UI
rendering, layout, or user interactions.

---

## Responsive Design Rules

- The UI must be fully responsive and fit the screen on both desktop
  and mobile devices.
- **Landscape only.** Portrait orientation is not supported -- show a
  "Please rotate your device" overlay in portrait mode.
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) to adapt
  layouts across breakpoints.
- Breakpoints: mobile (<768px), tablet (768--1279px),
  desktop (>=1280px).
- Panels must collapse or reflow on small screens -- never cause
  horizontal overflow.
- The flag canvas must scale fluidly to fill available space without
  horizontal scrolling.
- On desktop (>=1280px), the leftbar expands to ~240px with labels.
- On tablet, the leftbar collapses to a 48px icon strip with
  slide-out overlay panel.
- On mobile, icon-only leftbar. Rightbar hidden. Canvas maximized.

---

## Layout Constraints

- **Fixed full-viewport layout.** `100dvh x 100dvw`. No page-level
  scrolling, no content overflow.
- Grid: `grid-template-rows: auto 1fr;
  grid-template-columns: 48px 1fr` (mobile) /
  `240px 1fr` (desktop >=1280px).
- **No scrollbars ever.** Internal overflow within the leftbar uses
  hidden-scrollbar CSS (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`).
- **No text selection** on UI elements (`user-select: none` globally).
  Exception: text input fields.
- **No mobile swiping / pull-to-refresh.** Apply
  `overscroll-behavior: none; touch-action: none` on html/body.
  Re-enable `touch-action` on specific interactive elements as needed.

---

## Z-Index Stack

| Layer | z-index | Element |
| --- | --- | --- |
| Base | 0 | Canvas background |
| Flag | 10 | Flag SVG |
| Leftbar panel | 40 | Flag editor (and slide-out on mobile) |
| Rightbar | 45 | Dynamic tools (floating, right edge) |
| Botbar | 50 | Floating zoom controls |
| Topbar | 60 | Application settings bar |
| Modals/Dialogs | 100 | Confirm dialogs, export modals |
| Toasts | 110 | Notification toasts |
| Portrait overlay | 999 | "Rotate device" message |

---

## Symbols.json Schema

Each entry in the symbol catalog must have:

- `id` -- unique string identifier.
- `name` -- human-readable display name.
- `category` -- category string for filtering (e.g. "Stars",
  "Crosses", "Celestial").
- `viewBox` -- SVG viewBox string (e.g. `"0 0 100 100"`).
- `svg` -- inner SVG markup string (for complex multi-shape emblems).
- `path` -- (alternative to `svg`) single SVG path `d` attribute.
- `generator` -- (alternative to `svg`/`path`) named generator
  function (e.g. `"star5"`).

The converter (`tools/svg2symbols.mjs`) may also emit `sourceFile`.
New symbols must follow this schema.

### Recolor modes (svg2symbols.mjs)

- `keep` -- preserve original colors from source SVG.
- `currentColor` -- replace all fills/strokes with `currentColor`.
- `mono:#hex` -- single-color override.

### Imported symbol color policy

- Imported symbols that are monochrome should have their color stripped so
  fills and strokes resolve through `currentColor`, allowing the user to
  recolor them in the editor.
- Imported symbols that contain more than one color must keep their original
  colors and must not be flattened to a single recolorable tint.
