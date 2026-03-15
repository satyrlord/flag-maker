import { chromium } from "@playwright/test";
import { JSDOM } from "jsdom";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// renderFlag() and registerBuiltinSymbols() / registerSymbols() work with a
// module-level symbol registry rather than accepting symbols as parameters.
import { renderFlag, registerBuiltinSymbols, registerSymbols } from "../src/flagRenderer";
import { normalizeImportedSymbol } from "../src/symbolLoader";
import { ALL_TEMPLATE_FACTORIES, TEMPLATE_CATALOG } from "../src/templateCatalog";
import type { TemplateCfg } from "../src/templates";
import type { FlagDesign, Overlay, SymbolDef } from "../src/types";
import { collectSymbolIds } from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const previewDir = path.join(repoRoot, "public", "template-previews");
const tempPreviewDir = path.join(repoRoot, "public", "template-previews.__tmp__");
const manifestPath = path.join(repoRoot, "src", "config", "template-preview-manifest.generated.json");
const tempManifestPath = `${manifestPath}.tmp`;
const flagsTodoPath = path.join(repoRoot, "flags-todo.md");
const symbolCatalogPath = path.join(repoRoot, "src", "config", "symbols-catalog.generated.json");
const runtimeSymbolsPath = path.join(repoRoot, "public", "symbols.json");

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_QUALITY = 0.86;

function installDomGlobals(): void {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
  });
  globalThis.window = window as unknown as typeof globalThis & Window;
  globalThis.document = window.document;
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.SVGElement = window.SVGElement;
  globalThis.Node = window.Node;
}

function cloneRatio(ratio: [number, number]): [number, number] {
  return [...ratio] as [number, number];
}

function cloneOverlays(overlays: Overlay[]): Overlay[] {
  return overlays.map((overlay) => ({ ...overlay }));
}

function buildDesignFromTemplate(config: TemplateCfg): FlagDesign {
  return {
    orientation: config.orientation ?? "horizontal",
    ratio: cloneRatio(config.ratio),
    sections: config.sections,
    weights: config.weights
      ? [...config.weights]
      : Array.from<number>({ length: config.sections }).fill(1),
    colors: [...config.colors],
    overlays: cloneOverlays(config.overlays),
  };
}

function parseDoneTemplateIds(markdown: string): Set<string> {
  const doneIds = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|")) {
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 4) {
      continue;
    }
    const rawId = cells[2];
    const status = cells[3].toLowerCase();
    if (!rawId.startsWith("`") || status !== "done") {
      continue;
    }
    doneIds.add(rawId.replace(/`/g, ""));
  }
  return doneIds;
}

async function loadRuntimeSymbols(): Promise<SymbolDef[]> {
  try {
    const runtimeSymbolsRaw = await readFile(runtimeSymbolsPath, "utf8");
    return (JSON.parse(runtimeSymbolsRaw) as SymbolDef[]).map(normalizeImportedSymbol);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // symbols.json is optional; its absence is not an error.
      return [];
    }
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as NodeJS.ErrnoException).code ?? "no error code";
    const relPath = path.relative(process.cwd(), runtimeSymbolsPath);
    throw new Error(
      `Failed to load runtime symbols from ${relPath} (${code}): ${message}. ` +
      "Ensure the file is valid JSON, or delete it to fall back to built-in symbols only.",
    );
  }
}

async function loadBuiltinSymbols(): Promise<SymbolDef[]> {
  const builtinCatalogRaw = await readFile(symbolCatalogPath, "utf8");
  const builtinCatalog = JSON.parse(builtinCatalogRaw) as { symbols?: SymbolDef[] };
  return Array.isArray(builtinCatalog.symbols) ? builtinCatalog.symbols : [];
}

/**
 * Returns symbol IDs referenced by `design` that are not present in
 * `availableSymbolIds`. Used to detect missing symbol dependencies before
 * attempting to render a template preview.
 */
function findMissingSymbolIds(design: FlagDesign, availableSymbolIds: Set<string>): string[] {
  return collectSymbolIds(design.overlays).filter((symbolId) => !availableSymbolIds.has(symbolId));
}

async function main(): Promise<void> {
  installDomGlobals();

  const [flagsTodo, builtinSymbols, runtimeSymbols] = await Promise.all([
    readFile(flagsTodoPath, "utf8"),
    loadBuiltinSymbols(),
    loadRuntimeSymbols(),
  ]);
  const doneIds = parseDoneTemplateIds(flagsTodo);
  // Pre-register all symbols upfront (not lazily) so renderFlag() can resolve
  // every symbol id without triggering async category loads.
  registerBuiltinSymbols(builtinSymbols);
  if (runtimeSymbols.length > 0) {
    registerSymbols(runtimeSymbols);
  }
  const availableSymbolIds = new Set([...builtinSymbols, ...runtimeSymbols].map((symbol) => symbol.id));

  const entries = TEMPLATE_CATALOG.filter((entry) => doneIds.has(entry.id));
  await rm(tempPreviewDir, { recursive: true, force: true });
  await rm(tempManifestPath, { force: true });
  await mkdir(tempPreviewDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const screenshotPage = await browser.newPage();

    const manifest: Record<string, { imagePath: string }> = {};

    for (const entry of entries) {
      const create = ALL_TEMPLATE_FACTORIES[entry.id];
      if (!create) {
        throw new Error(`template preview build: missing factory for \"${entry.id}\"`);
      }
      const design = buildDesignFromTemplate(create());
      const missingSymbolIds = findMissingSymbolIds(design, availableSymbolIds);
      if (missingSymbolIds.length > 0) {
        throw new Error(`template preview build: missing symbols for \"${entry.id}\": ${missingSymbolIds.join(", ")}`);
      }
      const svgEl = renderFlag(design);
      const xml = new XMLSerializer().serializeToString(svgEl);
      const width = THUMBNAIL_WIDTH;
      const height = Math.round((svgEl.viewBox.baseVal.height / svgEl.viewBox.baseVal.width) * width);
      const imagePath = `template-previews/${entry.id}.jpg`;
      const outputPath = path.join(tempPreviewDir, `${entry.id}.jpg`);

      await screenshotPage.setViewportSize({ width, height });
      await screenshotPage.setContent(
        `<!doctype html><html><body style="margin:0;background:#ffffff;display:flex;align-items:flex-start;justify-content:flex-start;">${xml}</body></html>`,
      );
      const svg = screenshotPage.locator("svg").first();
      await svg.evaluate((element, dims) => {
        element.setAttribute("width", String(dims.width));
        element.setAttribute("height", String(dims.height));
      }, { width, height });
      await svg.screenshot({ path: outputPath, type: "jpeg", quality: Math.round(THUMBNAIL_QUALITY * 100) });

      manifest[entry.id] = { imagePath };
    }

    await writeFile(tempManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } finally {
    await browser.close();
  }

  await rm(previewDir, { recursive: true, force: true });
  await rename(tempPreviewDir, previewDir);
  await rename(tempManifestPath, manifestPath);
  console.log(`Generated ${entries.length} template preview images.`);
}

await main();
