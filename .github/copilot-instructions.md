# Flag Maker — Copilot Instructions

## Project Purpose

This is a fork of [mohadian/flag-maker](https://github.com/mohadian/flag-maker) being evolved into a modern, feature-rich, free and open-source flag design tool. The goal is to rival professional tools like [Flag Creator](https://flag-creator.com/) while remaining entirely free and community-driven. Every contribution should push toward a more polished, capable, and fun flag-making experience.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss` plugin + autoprefixer)
- **Path alias:** `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- **Assets:** SVG emblems in `public/emblems/`, symbol catalog in `public/symbols.json`
- **Tooling:** Python (`tools/fetch_emblems.py`) for Wikimedia emblem fetching, Node (`tools/svg2symbols.mjs`) for SVG-to-symbol conversion

## Architecture

The app is currently a single large component (`FlagMaker.tsx`) with all domain types, state, rendering, and logic co-located. Key architectural facts:

- **Coordinate system:** Percent-based (0–100%) for resolution independence. Canvas uses a fixed `viewBox` width of 1200; height is derived from the selected aspect ratio.
- **Overlay model:** Each overlay (`rect`, `circle`, `star`, `path`, `symbol`) has position/size in `%`, plus fill/stroke/opacity/rotation. Overlays support lock, z-order, and drag repositioning.
- **Symbol system:** Built-in symbols (stars, crescents, crosses) plus loaded emblems from `symbols.json` (national coats of arms/emblems with full inner SVG markup and viewBox). Users can also import custom symbol JSON.
- **Template system:** Heraldic division templates (Per Pale, Per Fess, Per Bend, Saltire, Chevron, Nordic Cross, etc.) and national flag presets.
- **History:** Undo/redo via JSON snapshot stacks.
- **Export:** SVG download and SVG-to-PNG via canvas rasterization.
- **Emblem rendering:** Uses `dangerouslySetInnerHTML` for complex SVG emblem markup — be cautious and sanitize any user-provided SVG content.

## Code Style & Conventions

- Use TypeScript strict mode. Define explicit types/interfaces for domain objects (`Overlay`, `SymbolDef`, etc.).
- Use functional React components with hooks (`useState`, `useMemo`, `useEffect`, `useCallback`).
- Use Tailwind utility classes for styling. No CSS modules or styled-components.
- Prefer descriptive variable and function names. Flag domain terms: stripe, overlay, emblem, symbol, canton, fess, pale, bend, saltire, chevron.
- When adding new overlay shapes or symbol types, follow the existing pattern in `FlagMaker.tsx` (builder function → state update → SVG rendering).
- Keep SVG output clean and spec-compliant — exported flags should open correctly in any SVG viewer or editor.

## Development Direction

This fork is actively adding features to match and exceed professional flag makers. Priority areas include:

- **UI modernization:** Break `FlagMaker.tsx` into smaller, focused components. Add a proper component hierarchy with a toolbar, layer panel, property inspector, and canvas.
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

## File Layout

| Path | Purpose |
|------|---------|
| `src/FlagMaker.tsx` | Main editor component (flag canvas + controls) |
| `src/App.tsx` | Root app wrapper |
| `src/main.tsx` | React DOM entry point |
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

- **Site target:** https://satyrlord.github.io/flag-maker/
