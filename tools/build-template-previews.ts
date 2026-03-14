import { chromium } from "@playwright/test";
import { JSDOM } from "jsdom";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderFlag, registerSymbols } from "../src/flagRenderer";
import { normalizeImportedSymbol } from "../src/symbolLoader";
import { ALL_TEMPLATE_FACTORIES, TEMPLATE_CATALOG } from "../src/templateCatalog";
import type { TemplateCfg } from "../src/templates";
import type { FlagDesign, Overlay, SymbolDef } from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const previewDir = path.join(repoRoot, "public", "template-previews");
const tempPreviewDir = path.join(repoRoot, "public", "template-previews.__tmp__");
const manifestPath = path.join(repoRoot, "src", "config", "template-preview-manifest.generated.json");
const tempManifestPath = `${manifestPath}.tmp`;
const flagsTodoPath = path.join(repoRoot, "flags-todo.md");
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

function dataUrlToBuffer(dataUrl: string): Buffer {
  const [, base64] = dataUrl.split(",", 2);
  return Buffer.from(base64, "base64");
}

async function main(): Promise<void> {
  installDomGlobals();

  const [flagsTodo, runtimeSymbolsRaw] = await Promise.all([
    readFile(flagsTodoPath, "utf8"),
    readFile(runtimeSymbolsPath, "utf8"),
  ]);
  const doneIds = parseDoneTemplateIds(flagsTodo);
  const runtimeSymbols = (JSON.parse(runtimeSymbolsRaw) as SymbolDef[]).map(normalizeImportedSymbol);
  registerSymbols(runtimeSymbols);

  const entries = TEMPLATE_CATALOG.filter((entry) => doneIds.has(entry.id));
  await rm(tempPreviewDir, { recursive: true, force: true });
  await rm(tempManifestPath, { force: true });
  await mkdir(tempPreviewDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const rasterPage = await browser.newPage();
    const screenshotPage = await browser.newPage();
    await rasterPage.setContent("<!doctype html><html><body></body></html>");

    const manifest: Record<string, { imagePath: string }> = {};

    for (const entry of entries) {
      const create = ALL_TEMPLATE_FACTORIES[entry.id];
      if (!create) {
        throw new Error(`template preview build: missing factory for \"${entry.id}\"`);
      }
      const design = buildDesignFromTemplate(create());
      const svgEl = renderFlag(design);
      const xml = new XMLSerializer().serializeToString(svgEl);
      const width = THUMBNAIL_WIDTH;
      const height = Math.round((svgEl.viewBox.baseVal.height / svgEl.viewBox.baseVal.width) * width);
      const imagePath = `template-previews/${entry.id}.jpg`;
      const outputPath = path.join(tempPreviewDir, `${entry.id}.jpg`);

      try {
        const jpgDataUrl = await rasterPage.evaluate(
          ({ markup, outWidth, outHeight, quality }) =>
            new Promise<string>((resolve, reject) => {
              const img = new Image();
              const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
              const objectUrl = URL.createObjectURL(blob);
              const cleanup = (): void => {
                URL.revokeObjectURL(objectUrl);
                img.onload = null;
                img.onerror = null;
              };

              img.onerror = () => {
                cleanup();
                reject(new Error("template preview build: failed to load SVG as image"));
              };
              img.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = outWidth;
                  canvas.height = outHeight;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) {
                    cleanup();
                    return resolve("");
                  }
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL("image/jpeg", quality);
                  cleanup();
                  resolve(dataUrl);
                } catch (error) {
                  cleanup();
                  reject(error instanceof Error ? error : new Error("template preview build: rasterization failed"));
                }
              };
              img.src = objectUrl;
            }),
          { markup: xml, outWidth: width, outHeight: height, quality: THUMBNAIL_QUALITY },
        );
        await writeFile(outputPath, dataUrlToBuffer(jpgDataUrl));
      } catch (error) {
        console.warn(`template preview build: export raster fallback for ${entry.id}`);
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
        if (error instanceof Error) {
          console.warn(error.message);
        }
      }

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
