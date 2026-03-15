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

interface GeneratedSymbolCatalogCategory {
  name: string;
  slug: string;
  files: string[];
  count: number;
  ids: string[];
}

interface GeneratedSymbolCatalogIndexEntry {
  id: string;
  name: string;
  category: string;
  slug: string;
}

interface GeneratedSymbolCatalogIndex {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  categories: GeneratedSymbolCatalogCategory[];
  symbols: GeneratedSymbolCatalogIndexEntry[];
}

interface GeneratedSymbolCatalogShard {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  category: string;
  slug: string;
  symbols: SymbolRuntimeEntry[];
}

interface ExtractedSvg {
  viewBox: string;
  inner: string;
}

const CONFIG_PATH = path.resolve("src/config/symbols-config.json");
// 225 KB per shard balances network round-trip overhead against individual file
// size. Shards above this threshold are split to avoid large blocking payloads
// on slow connections; below it, chunking overhead outweighs the benefit.
// The threshold applies per shard and is estimated by summing JSON.stringify(symbol).length
// for each individual symbol; it does not include JSON array brackets or separators,
// so the actual payload will be slightly larger. This is an initial heuristic;
// tune the value against real-world performance metrics if needed.
const TARGET_SHARD_SIZE_BYTES = 225_000;

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
  const outputDirectory = path.dirname(outputPath);
  const outputBaseName = path.basename(outputPath, ".json");
  const shardDirectoryName = outputBaseName;
  const shardDirectoryPath = path.join(outputDirectory, shardDirectoryName);
  const indexBaseName = outputBaseName.endsWith(".generated")
    ? outputBaseName.slice(0, -".generated".length)
    : outputBaseName;
  const indexFileName = `${indexBaseName}-index.generated.json`;
  const indexPath = path.join(outputDirectory, indexFileName);
  const generatedAt = new Date().toISOString();
  const generatedBy = "tools/build-symbol-catalog.ts";

  const generatedCatalog: GeneratedSymbolCatalog = {
    _meta: {
      generatedAt,
      generatedBy,
    },
    symbols: runtimeEntries,
  };

  const categoryGroups = new Map<string, SymbolRuntimeEntry[]>();
  for (const entry of runtimeEntries) {
    const existing = categoryGroups.get(entry.category);
    if (existing) {
      existing.push(entry);
      continue;
    }
    categoryGroups.set(entry.category, [entry]);
  }

  const usedSlugs = new Map<string, string>();
  const categoryDescriptors = [...categoryGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, symbols]) => {
      const slug = slugifyCategory(category);
      const previousCategory = usedSlugs.get(slug);
      if (previousCategory && previousCategory !== category) {
        throw new Error(`Category slug collision: "${category}" conflicts with "${previousCategory}" as "${slug}"`);
      }
      usedSlugs.set(slug, category);
      const shardGroups = partitionCategorySymbols(symbols, TARGET_SHARD_SIZE_BYTES);
      return {
        category,
        slug,
        files: shardGroups.map((_, index) => `${shardDirectoryName}/${formatShardFileName(slug, index, shardGroups.length)}`),
        shards: shardGroups,
        symbols,
      };
    });

  const generatedIndex: GeneratedSymbolCatalogIndex = {
    _meta: {
      generatedAt,
      generatedBy,
    },
    categories: categoryDescriptors.map(({ category, slug, files, symbols }) => ({
      name: category,
      slug,
      files,
      count: symbols.length,
      ids: symbols.map((symbol) => symbol.id),
    })),
    symbols: categoryDescriptors.flatMap(({ category, slug, symbols }) =>
      symbols.map((symbol) => ({
        id: symbol.id,
        name: symbol.name,
        category,
        slug,
      })),
    ),
  };

  await fs.rm(shardDirectoryPath, { recursive: true, force: true });
  await fs.mkdir(shardDirectoryPath, { recursive: true });

  await fs.writeFile(outputPath, `${JSON.stringify(generatedCatalog, null, 2)}\n`, "utf8");
  await fs.writeFile(indexPath, `${JSON.stringify(generatedIndex, null, 2)}\n`, "utf8");

  await Promise.all(categoryDescriptors.flatMap(({ category, slug, files, shards }) =>
    shards.map(async (symbols, index) => {
      const shardPath = path.join(outputDirectory, files[index]);
      const shard: GeneratedSymbolCatalogShard = {
        _meta: {
          generatedAt,
          generatedBy,
        },
        category,
        slug,
        symbols,
      };
      await fs.writeFile(shardPath, `${JSON.stringify(shard, null, 2)}\n`, "utf8");
    }),
  ));

  console.log(`Wrote ${runtimeEntries.length} symbols to ${path.relative(process.cwd(), outputPath)}`);
  console.log(`Wrote ${categoryDescriptors.reduce((count, descriptor) => count + descriptor.files.length, 0)} symbol shards to ${path.relative(process.cwd(), shardDirectoryPath)}`);
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

function slugifyCategory(category: string): string {
  const slug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error(`Could not derive a category slug from "${category}"`);
  }
  return slug;
}

function formatShardFileName(slug: string, index: number, totalShards: number): string {
  // Single-shard categories use just the slug; multi-shard use 1-based numbering.
  return totalShards === 1 ? `${slug}.json` : `${slug}-${index + 1}.json`;
}

function estimateSymbolSize(symbol: SymbolRuntimeEntry): number {
  return JSON.stringify(symbol).length;
}

function partitionCategorySymbols(symbols: SymbolRuntimeEntry[], targetSize: number): SymbolRuntimeEntry[][] {
  const shards: SymbolRuntimeEntry[][] = [];
  let currentShard: SymbolRuntimeEntry[] = [];
  let currentSize = 0;

  for (const symbol of symbols) {
    const nextSize = estimateSymbolSize(symbol);
    if (currentShard.length > 0 && currentSize + nextSize > targetSize) {
      shards.push(currentShard);
      currentShard = [];
      currentSize = 0;
    }
    currentShard.push(symbol);
    currentSize += nextSize;
  }

  if (currentShard.length > 0) {
    shards.push(currentShard);
  }

  return shards;
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
