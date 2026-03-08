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

Domain logic is separated into pure TypeScript modules. The UI is built with direct DOM manipulation (no framework). Key architectural facts:

- **Module structure:** Types (`types.ts`), utilities (`utils.ts`), geometry (`geometry.ts`), overlay builders (`overlays.ts`), symbol data (`symbols.ts`), symbol loading (`symbolLoader.ts`), templates (`templates.ts`), entry point (`main.ts`).
- **Coordinate system:** Percent-based (0–100%) for resolution independence. Canvas uses a fixed `viewBox` width of 1200; height is derived from the selected aspect ratio.
- **Overlay model:** Each overlay (`rect`, `circle`, `star`, `path`, `symbol`) has position/size in `%`, plus fill/stroke/opacity/rotation. Overlays support lock, z-order, and drag repositioning.
- **Symbol system:** Built-in symbols (stars, crescents, crosses) plus loaded emblems from `symbols.json` (national coats of arms/emblems with full inner SVG markup and viewBox). Users can also import custom symbol JSON.
- **Template system:** Heraldic division templates (Per Pale, Per Fess, Per Bend, Saltire, Chevron, Nordic Cross, etc.) and national flag presets.
- **History:** Undo/redo via JSON snapshot stacks.
- **Export:** SVG download and SVG-to-PNG via canvas rasterization.
- **Emblem rendering:** Uses `innerHTML` for complex SVG emblem markup — be cautious and sanitize any user-provided SVG content.

## Code Style & Conventions

- Use TypeScript strict mode. Define explicit types/interfaces for domain objects (`Overlay`, `SymbolDef`, etc.).
- No frameworks — use direct DOM manipulation (`document.createElement`, `document.createElementNS` for SVG, `addEventListener`, etc.).
- Use ES modules with explicit imports/exports. Keep domain logic in pure functions separate from DOM code.
- Use Tailwind utility classes for styling. No CSS modules or styled-components.
- Prefer descriptive variable and function names. Flag domain terms: stripe, overlay, emblem, symbol, canton, fess, pale, bend, saltire, chevron.
- When adding new overlay shapes or symbol types, add builder functions to `overlays.ts` and rendering logic to the canvas module.
- Keep SVG output clean and spec-compliant — exported flags should open correctly in any SVG viewer or editor.

## Development Direction

This fork is actively adding features to match and exceed professional flag makers. Priority areas include:

- **UI modernization:** Build a proper UI with a toolbar, layer panel, property inspector, and canvas using direct DOM manipulation.
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

## Quality Gate

Every change must pass all four checks before being considered complete:

```bash
npm run quality   # runs all three below in sequence
npm run typecheck # tsc --noEmit
npm run lint      # eslint src/
npm run lint:md   # markdownlint-cli2 on all .md files
```

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
| `src/index.css` | Tailwind CSS import |
| `public/symbols.json` | Generated symbol/emblem catalog |
| `public/emblems/` | Raw SVG emblem source files (193 files) |
| `tools/fetch_emblems.py` | Wikimedia Commons emblem downloader |
| `tools/svg2symbols.mjs` | SVG → symbols.json converter (SVGO + recolor) |

## Important Notes

- **SVG security:** When rendering user-provided or external SVG content, always sanitize to prevent XSS. The existing `dangerouslySetInnerHTML` usage for emblems is acceptable only because the data comes from our own curated `symbols.json`.
- **Symbols.json schema:** Each entry has `id`, `name`, `category`, `viewBox`, `svg` (inner SVG markup), and `sourceFile`. New symbols must follow this schema.
- **Recolor modes** in `svg2symbols.mjs`: `keep` (preserve original colors), `currentColor` (replace fills/strokes with currentColor), `mono:#hex` (single-color override).
- **Tailwind v4:** Uses the new `@import "tailwindcss"` syntax in CSS, not the v3 `@tailwind` directives.
- **Node >=18** required (see `package.json` engines).

## Deployment Notes

- **Site target:** <https://satyrlord.github.io/flag-maker/>
