# Flag Maker

Design flags with adjustable stripes and overlays (rectangles, circles, stars,
**national emblems**).
Supports drag, edit, and export to **SVG/PNG**. Loads a
`public/symbols.json` library (built-ins + your own) including **full
multi-shape SVG emblems**.

Templates are grouped into **Division**, **National**, and **State Level**
sections so you can start from heraldic layouts, sovereign flags, or selected
subnational flags such as England, Scotland, Wales, Catalunya, Euskadi, and
Bavaria.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict mode, ES2020, DOM libs) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss` plugin) |
| Components | DaisyUI 5 (component classes and custom themes) |
| UI approach | No framework -- direct DOM manipulation with ES modules |
| Testing | Vitest (unit/integration) + Playwright (e2e, headless) |
| Coverage | `@vitest/coverage-v8` (Vitest) + Istanbul via `vite-plugin-istanbul` (Playwright) |
| Path alias | `@/` maps to `src/` |
| Node | >=20 (see `package.json` engines) |

---

## Quick Start

### Requirements

- **Node.js 20+**.
  Check: `node -v`
- **npm** 10+ (comes with Node 20+)

### 1) Install

```bash
npm install
```

### 2) Run in dev

```bash
npm run dev
# open the printed URL (usually http://localhost:5173/)
```

### 3) Build for production

```bash
npm run build
npm run preview
```

### 4) Run quality gates

```bash
npm run quality
npm run quality:full
```

- `npm run quality` runs typecheck, ESLint, markdown lint, and Vitest coverage (no build step). The build is handled by Playwright's `webServer` when running `quality:full`.
- `npm run quality:full` runs the quick gate plus headless Playwright coverage on desktop and mobile projects.
- Both Vitest and Playwright coverage enforce a minimum of **80% per file** for statements, branches, functions, and lines.

---

## Project Structure (key files)

```text
.
├─ public/
│  └─ symbols.json          # (optional) emblem library, auto-loaded at runtime
├─ src/
│  ├─ main.ts               # Vite entry point (DOM bootstrap)
│  ├─ types.ts              # Domain types (Overlay, SymbolDef, FlagDesign, etc.)
│  ├─ utils.ts              # Pure utilities (clamp, uid, starPath, download, svgToPng)
│  ├─ geometry.ts           # Flag geometry (viewBox, stripe rect computation)
│  ├─ overlays.ts           # Overlay builder functions (rect, poly, star, band)
│  ├─ symbols.ts            # Built-in symbol registry (from generated catalog)
│  ├─ symbolLoader.ts       # Fetch and merge symbols from symbols.json
│  ├─ templates.ts          # Division, national, and state-level template factories
│  ├─ templateCatalog.ts    # Composes template groups from config files
│  ├─ config/
│  │  ├─ leftbar-config.json            # Leftbar UI config and declared template groups
│  │  ├─ template-division-config.json  # Division template catalog entries
│  │  ├─ national-division-config.json  # National template catalog entries
│  │  ├─ substate-division-config.json  # State-level template catalog entries
│  │  ├─ symbols-config.json            # Symbol source index (metadata files + svg dir)
│  │  ├─ symbols-catalog.generated.json # Generated built-in runtime symbol catalog
│  │  └─ symbols/                       # Source metadata and per-symbol SVG files
│  ├─ vite-env.d.ts        # Vite client type declarations (CSS imports, env)
│  └─ index.css             # Tailwind CSS import
├─ tools/
│  ├─ fetch-emblems.ts       # fetch official emblems from Wikimedia
│  ├─ fetch-symbols.ts       # fetch curated flag symbols into source metadata + SVG files
│  ├─ build-symbol-catalog.ts # generate runtime symbol catalog from source metadata
│  └─ svg2symbols.mjs       # convert a folder of SVGs -> public/symbols.json
├─ tailwind.config.js       # Tailwind config (legacy v3 format; v4 uses CSS-based config)
├─ postcss.config.js        # Tailwind v4 (using @tailwindcss/postcss)
├─ package.json
└─ README.md
```

---

## Using the App

- **Canvas**: choose orientation, aspect ratio, number of sections (stripes).
  Set each stripe's color + weight.
- **Templates**: start from grayscale division templates, national flags, or
  the new **State Level** preset group for selected subnational flags.
- **Overlays**: add rectangle, circle, star, custom path, or **Symbol** from
  the dropdown.
  - Drag overlays directly on the flag.
  - Adjust fill/stroke/opacity/size/rotation; lock/unlock; z-order; delete.
- **Symbol Library**:
  - Includes a small built-in starter set (star, crescent, crosses, etc.).
  - Auto-loads `public/symbols.json` if present.
  - Supports **full multi-shape SVG** emblems via `{ svg, viewBox }`.
- **Reset**: the Reset button in the topbar restores the flag to the default
  three-stripe design and clears all overlays.
- **Grid overlay**: click the grid button in the right toolbar to toggle a
  pixel grid over the flag. Each click cycles the grid color
  (cyan -> magenta -> off). Scroll the mouse wheel over the button to
  change grid density, or right-click to pick a specific size.
- **Export**: download as SVG or PNG.

> **Note:** The app is fully responsive but only supports **landscape
> orientation** on mobile and tablet. Most real-world flags are wider than
> tall, so the UI and flags would be too small in portrait mode. There are no
> current plans to add portrait support.

**Tip:** The app reads `symbols.json` at `/symbols.json`. With Vite, place it
in **`public/`**.

---

## Adding Official Emblems (Three Tools)

### A) `fetch-emblems.ts` -- download SVG emblems from Wikimedia

Fetches official **SVG** emblem files (coats of arms) for UN-recognized
countries, then you can convert them into `symbols.json` with the converter
(tool C).

#### IMPORTANT: Set a compliant User-Agent

Edit the script header to include a real website/GitHub and email (Wikimedia
policy):

```typescript
// inside tools/fetch-emblems.ts
const CONTACT = "https://your-site-or-github ; email: you@example.com";
const USER_AGENT = `FlagMakerCollector/1.0 (${CONTACT}) node-fetch`;
```

If you don't, Wikimedia may return **403 Forbidden**.

#### Run it

```bash
npm run fetch-emblems
```

- Downloads raw SVGs into `public/emblems/`.
- It's polite (rate-limited, retries, backoff) and merges results on subsequent
  runs.
- Some countries may fail or have multiple variants; you can add filename
  overrides later if needed.

> Licensing: many emblems on Commons are public domain or permissive, but
> **always check each file's page**. The script stores a `source`/`license`
> hint per entry when you later build `symbols.json`.

---

### B) `fetch-symbols.ts` -- download curated flag symbols from Wikimedia

Fetches individual flag symbols (suns, stars, eagles, heraldic charges, plants,
etc.) from Wikimedia Commons using a curated manifest. These are symbols
commonly *on* flags, not national coats of arms.

#### User-Agent setup

Same as tool A -- edit the CONTACT header in the script.

#### Usage

```bash
npm run fetch-symbols
```

- Updates `src/config/symbols/metadata/*.json` and `src/config/symbols/svg/*.svg` by default.
- Regenerates `src/config/symbols-catalog.generated.json` automatically after import.
- Use `--out public/symbols.json` to write a flat runtime JSON file instead.
- Use `--skip-existing` to skip symbols that are already defined in the source metadata.
- Downloads are cached in `public/emblems/`; safe to re-run.

#### Adding new symbols to the manifest

Edit the `SYMBOL_MANIFEST` array in `tools/fetch-symbols.ts`. Each entry needs:

```typescript
{
  id: "unique_id",
  name: "Display Name",
  category: "Celestial",  // or Heraldic, Cultural, Plants, Animals, etc.
  titles: [
    "Exact Wikimedia Commons File Title.svg",
    "Fallback Title.svg",
  ],
}
```

The script tries each title in order, then falls back to a Commons search.

After a successful default run, the app consumes the regenerated
`src/config/symbols-catalog.generated.json` file automatically.

---

### C) `build-symbol-catalog.ts` -- generate built-in runtime symbols

Builds `src/config/symbols-catalog.generated.json` from the split source files:

- `src/config/symbols-config.json` for the source index
- `src/config/symbols/metadata/*.json` for per-category metadata
- `src/config/symbols/svg/*.svg` for SVG payloads

Usage:

```bash
npm run build:symbols
```

Run this after any manual edit to symbol metadata or SVG source files.

---

### D) `svg2symbols.mjs` -- convert SVG files -> `public/symbols.json`

Reads a folder of SVGs, **preserves viewBox**, inlines styles, and emits a
`symbols.json` that your app loads. Can output **authentic colors** or
**tintable** (recolorable) symbols.

#### Install dependencies

Both `svgo` and `fast-xml-parser` are already in `devDependencies`; just run
`npm install`. If you need to reinstall manually:

```bash
npm i -D svgo@^4 fast-xml-parser
```

#### Converting SVGs

Convert all SVGs in a folder to a merged `symbols.json`:

```bash
# Keep official colors
node tools/svg2symbols.mjs --in downloads/emblems \
  --out public/symbols.json --category "National Emblems"

# Make a tintable library (use overlay Fill/Stroke in the app)
node tools/svg2symbols.mjs --in downloads/emblems \
  --out public/symbols.json --mode currentColor --strip

# Force a monochrome color (e.g., dark gray)
node tools/svg2symbols.mjs --in downloads/emblems \
  --out public/symbols.json --mode mono:#222222 --strip
```

#### Flags

- `--in <dir>`: input directory with SVG files (e.g., `downloads/emblems`).
- `--out <file>`: output JSON file (default `public/symbols.json`).
- `--category <name>`: category label shown in the app.
- `--mode`:
  - `keep` (default): keep official colors.
  - `currentColor`: converts fills/strokes to `currentColor` so the app can
    tint them.
  - `mono:#RRGGBB`: hard-color a monochrome version.
- `--strip`: remove existing fills/strokes/styles before recoloring (useful for
  tinting).
- `--keepIds`: preserve element IDs/classes (default: clean them).
- `--prefix`: prefix to prepend to each generated `id` (optional).
- `--verbose`: log each processed file.

#### What it writes

Each symbol entry looks like:

```json
{
  "id": "uae_emblem",
  "name": "United Arab Emirates – Emblem",
  "category": "National Emblems",
  "viewBox": "0 0 2335.24 2754.38",
  "svg": "<g>…inner SVG markup only…</g>"
}
```

Your app's renderer scales it with the original `viewBox` for crisp, accurate
results.

---

## `symbols.json` Format (App-Ready)

`public/symbols.json` must be an **array** of objects. Each object can be:

- **Full emblem (preferred)**

  ```json
  {
    "id": "country_emblem",
    "name": "Country – National emblem",
    "category": "National Emblems",
    "viewBox": "0 0 800 800",
    "svg": "<g>...inner SVG children (no outer <svg>)...</g>"
  }
  ```

- **Simple path (legacy)** — scaled in a 100×100 box

  ```json
  { "id": "hexagram", "name": "Hexagram", "category": "Stars", "path": "M...Z" }
  ```

- **Generated** — star, etc.

  ```json
  { "id": "star5", "name": "Star (5-point)", "category": "Stars", "generator": "star5" }
  ```

The app merges this with built-in symbols.

---

## Recoloring Emblems (two approaches)

1. **Bake a tintable library** (recommended for design flexibility)
   Generate with:

   ```bash
   node tools/svg2symbols.mjs --in downloads/emblems \
     --out public/symbols.json --mode currentColor --strip
   ```

   In the app UI, set overlay **Fill/Stroke** to recolor the emblem.

2. **Keep official colors**
   Use `--mode keep` (default). The app will render the emblem in its original
   colors.

> The app's renderer handles both. If you want in-app toggles (original vs
> tinted), you can add an overlay option and set the `<g>` wrapper's
> fill/stroke accordingly.

---

## Troubleshooting

### `symbols.json` doesn't load

- Ensure it's at `public/symbols.json` (Vite serves `public/` at the site
  root).
- Visit `http://localhost:5173/symbols.json` directly; you should see JSON.
- It **must be an array**. A top-level object will be ignored.
- Check the app console: it prints a status ("Loaded N symbols…" or an error).

### Fetcher gets 403 from Wikimedia

- You **must** set a descriptive User-Agent + contact in `fetch-emblems.ts`.
- Try a smaller subset of countries while testing.
- Be patient; the script has polite backoff/retries.

### SVGO plugin errors

- Use **SVGO v4**.
  `npm i -D svgo@^4 fast-xml-parser`
- The script already uses a v4-safe config with `preset-default` and
  viewBox preservation.

### Tailwind / PostCSS warnings

- For Tailwind v4 with PostCSS:
  `npm i -D @tailwindcss/postcss postcss autoprefixer`
  `postcss.config.js` should reference `@tailwindcss/postcss`.

### TypeScript path alias for imports like `@/…`

Make sure your `tsconfig.json` has the `paths` alias (with `moduleResolution:
"bundler"`, `baseUrl` is not required):

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## Development Tips

- Start with a tiny `public/symbols.json` to verify loading:

  ```json
  [
    { "id": "test_star", "name": "Test Star", "category": "Test", "generator": "star5" }
  ]
  ```

- Then build your full pack with `svg2symbols.mjs`.
- If a specific emblem fails extraction, re-run `svg2symbols.mjs` with
  `--verbose` to see which file is problematic; the extractor is robust to
  nested `<svg>`, but malformed files can still need manual cleanup.

---

## License & Attribution

- This project's code is MIT-style (adjust to your preference).
- **Emblems** come from third-party sources (e.g., Wikimedia Commons).
