import { promises as fs } from "node:fs";
import path from "node:path";

interface SymbolCatalogConfig {
  metadataFiles: string[];
  svgDirectory: string;
  outputFile: string;
}

interface SymbolSourceEntry {
  id: string;
  name: string;
  category: string;
  svgFile?: string;
  viewBox?: string;
  path?: string;
  fillRule?: "evenodd" | "nonzero";
  generator?: "star5";
  source?: string;
  license?: string;
}

interface SymbolRuntimeEntry {
  id: string;
  name: string;
  category: string;
  svg?: string;
  viewBox?: string;
  path?: string;
  fillRule?: "evenodd" | "nonzero";
  generator?: "star5";
  source?: string;
  license?: string;
}

interface GeneratedSymbolCatalog {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  symbols: SymbolRuntimeEntry[];
}

interface ExtractedSvg {
  viewBox: string;
  inner: string;
}

const CONFIG_PATH = path.resolve("src/config/symbols-config.json");

async function main(): Promise<void> {
  const rawConfig = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(rawConfig) as SymbolCatalogConfig;
  validateConfig(config);

  const configDir = path.dirname(CONFIG_PATH);
  const seenIds = new Set<string>();
  const runtimeEntries: SymbolRuntimeEntry[] = [];

  for (const metadataFile of config.metadataFiles) {
    const metadataPath = path.resolve(configDir, metadataFile);
    const metadataRaw = await fs.readFile(metadataPath, "utf8");
    const entries = JSON.parse(metadataRaw) as SymbolSourceEntry[];
    if (!Array.isArray(entries)) {
      throw new Error(`Metadata file must contain an array: ${metadataPath}`);
    }

    for (const entry of entries) {
      validateSourceEntry(entry, metadataPath);
      if (seenIds.has(entry.id)) {
        throw new Error(`Duplicate symbol id detected: ${entry.id}`);
      }
      seenIds.add(entry.id);

      if (entry.svgFile) {
        const svgPath = path.resolve(configDir, config.svgDirectory, entry.svgFile);
        const extracted = await extractSvg(svgPath);
        runtimeEntries.push({
          id: entry.id,
          name: entry.name,
          category: entry.category,
          viewBox: extracted.viewBox,
          svg: extracted.inner,
          source: entry.source,
          license: entry.license,
        });
        continue;
      }

      runtimeEntries.push({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        viewBox: entry.viewBox,
        path: entry.path,
        fillRule: entry.fillRule,
        generator: entry.generator,
        source: entry.source,
        license: entry.license,
      });
    }
  }

  const outputPath = path.resolve(configDir, config.outputFile);
  const generatedCatalog: GeneratedSymbolCatalog = {
    _meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: "tools/build-symbol-catalog.ts",
    },
    symbols: runtimeEntries,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(generatedCatalog, null, 2)}\n`, "utf8");
  console.log(`Wrote ${runtimeEntries.length} symbols to ${path.relative(process.cwd(), outputPath)}`);
}

function validateConfig(config: SymbolCatalogConfig): void {
  if (!Array.isArray(config.metadataFiles) || config.metadataFiles.length === 0) {
    throw new Error("symbols-config.json must declare at least one metadata file");
  }
  if (!config.svgDirectory || !config.outputFile) {
    throw new Error("symbols-config.json must declare svgDirectory and outputFile");
  }
}

function validateSourceEntry(entry: SymbolSourceEntry, metadataPath: string): void {
  if (!entry.id || !entry.name || !entry.category) {
    throw new Error(`Invalid symbol entry in ${metadataPath}: missing id, name, or category`);
  }
  const definitionKeys = ([
    ["svgFile", entry.svgFile],
    ["path", entry.path],
    ["generator", entry.generator],
  ] as const)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
  if (definitionKeys.length !== 1) {
    const found = definitionKeys.length > 0 ? definitionKeys.join(", ") : "none";
    throw new Error(
      `Symbol ${entry.id} in ${metadataPath} must define exactly one of svgFile, path, or generator; found ${found}`,
    );
  }
}

async function extractSvg(filePath: string): Promise<ExtractedSvg> {
  const raw = await fs.readFile(filePath, "utf8");
  const startTagMatch = raw.match(/<svg\b[^>]*>/i);
  const endIdx = raw.lastIndexOf("</svg>");
  if (!startTagMatch || endIdx === -1) {
    throw new Error(`SVG file must contain a root <svg>: ${filePath}`);
  }

  const startTag = startTagMatch[0];
  const viewBoxMatch = startTag.match(/\bviewBox\s*=\s*"([^"]+)"/i);
  if (!viewBoxMatch) {
    throw new Error(`SVG file is missing a viewBox: ${filePath}`);
  }

  const innerStart = (startTagMatch.index ?? 0) + startTag.length;
  const inner = raw.slice(innerStart, endIdx).trim();
  if (!inner) {
    throw new Error(`SVG file contains no inner markup: ${filePath}`);
  }

  return {
    viewBox: viewBoxMatch[1],
    inner,
  };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
