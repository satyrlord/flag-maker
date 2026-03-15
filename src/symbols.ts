/* ──────────────────────────────────────────────
   Flag Maker – Built-in Symbols
   ────────────────────────────────────────────── */

import type { SymbolDef } from "./types";
import generatedCatalogIndex from "./config/symbols-catalog-index.generated.json";

export interface GeneratedSymbolCatalogFile {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  symbols: SymbolDef[];
}

export interface GeneratedSymbolCatalogIndexCategory {
  name: string;
  slug: string;
  files: string[];
  count: number;
  ids: string[];
}

export interface GeneratedSymbolCatalogIndexEntry {
  id: string;
  name: string;
  category: string;
  slug: string;
}

export interface GeneratedSymbolCatalogIndexFile {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  categories: GeneratedSymbolCatalogIndexCategory[];
  symbols: GeneratedSymbolCatalogIndexEntry[];
}

export interface GeneratedSymbolCatalogCategoryFile {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  category: string;
  slug: string;
  symbols: SymbolDef[];
}

type JsonModule<T> = {
  default: T;
};

const builtinCatalogIndex = generatedCatalogIndex as GeneratedSymbolCatalogIndexFile;

const builtinCategoryLoaders = import.meta.glob("./config/symbols-catalog.generated/*.json");
/* v8 ignore start */
if (Object.keys(builtinCategoryLoaders).length === 0 && import.meta.env.MODE !== "production") {
  console.warn(
    "[symbols] No built-in symbol shard files found. " +
    "These are generated JSON files containing symbol definitions. " +
    "Run `npm run build:symbols` to generate them from source files in src/config/symbols/.",
  );
}
/* v8 ignore stop */
const builtinCategoryByName = new Map(builtinCatalogIndex.categories.map((category) => [category.name, category]));
const builtinCategoryBySlug = new Map(builtinCatalogIndex.categories.map((category) => [category.slug, category]));
const builtinCategoryNameById = new Map(builtinCatalogIndex.symbols.map((symbol) => [symbol.id, symbol.category]));

const builtinSymbolsById = new Map<string, SymbolDef>();
const builtinCategoryPromises = new Map<string, Promise<GeneratedSymbolCatalogCategoryFile>>();
const loadedBuiltinCategorySlugs = new Set<string>();

function syncBuiltinSymbolsArray(): void {
  const orderedLoadedSymbols = builtinCatalogIndex.symbols
    .map((entry) => builtinSymbolsById.get(entry.id))
    .filter((symbol): symbol is SymbolDef => Boolean(symbol));
  BUILTIN_SYMBOLS.splice(0, BUILTIN_SYMBOLS.length, ...orderedLoadedSymbols);
}

async function loadBuiltinCategoryBySlug(slug: string): Promise<GeneratedSymbolCatalogCategoryFile> {
  const existingPromise = builtinCategoryPromises.get(slug);
  if (existingPromise) {
    return existingPromise;
  }

  const category = builtinCategoryBySlug.get(slug);
  /* v8 ignore start */
  if (!category) {
    const allSlugs = [...builtinCategoryBySlug.keys()];
    const listed = allSlugs.slice(0, 5).join(", ");
    const extra = allSlugs.length > 5 ? ` and ${allSlugs.length - 5} more` : "";
    throw new Error(`Unknown category slug: '${slug}'. Available slugs: ${listed}${extra}`);
  }
  /* v8 ignore stop */

  const loadPromise = Promise.all(category.files.map(async (filePath) => {
    const loader = builtinCategoryLoaders[`./config/${filePath}`];
    /* v8 ignore start */
    if (!loader) {
      throw new Error(
        `Symbol shard not found in glob result: ./config/${filePath}.` +
        ` The glob pattern may not have matched this file.` +
        ` Run \`npm run build:symbols\` to regenerate shards.`,
      );
    }
    /* v8 ignore stop */
    return (await loader() as JsonModule<GeneratedSymbolCatalogCategoryFile>).default;
  })).then((shards) => {
    const symbols = shards.flatMap((shard) => shard.symbols);
    for (const symbol of symbols) {
      builtinSymbolsById.set(symbol.id, symbol);
    }
    loadedBuiltinCategorySlugs.add(slug);
    syncBuiltinSymbolsArray();
    return {
      _meta: SYMBOL_CATALOG_META,
      category: category.name,
      slug,
      symbols,
    } satisfies GeneratedSymbolCatalogCategoryFile;
  });

  builtinCategoryPromises.set(slug, loadPromise);
  return loadPromise;
}

export const BUILTIN_SYMBOLS: SymbolDef[] = [];

const SYMBOL_CATALOG_META = builtinCatalogIndex._meta;
export const BUILTIN_SYMBOL_CATEGORIES = builtinCatalogIndex.categories.map((category) => category.name);

export function getLoadedBuiltinSymbols(): SymbolDef[] {
  return [...BUILTIN_SYMBOLS];
}

export function getBuiltinSymbolCategoryName(symbolId: string): string | undefined {
  return builtinCategoryNameById.get(symbolId);
}

export function isBuiltinSymbolCategoryLoaded(category: string): boolean {
  const descriptor = builtinCategoryByName.get(category);
  return descriptor ? loadedBuiltinCategorySlugs.has(descriptor.slug) : false;
}

export async function loadBuiltinSymbolsForCategory(category: string): Promise<SymbolDef[]> {
  const descriptor = builtinCategoryByName.get(category);
  if (!descriptor) {
    return [];
  }
  const shard = await loadBuiltinCategoryBySlug(descriptor.slug);
  return shard.symbols;
}

export async function ensureBuiltinSymbolsByIds(symbolIds: string[]): Promise<SymbolDef[]> {
  const categorySlugs = [...new Set(symbolIds
    .map((symbolId) => builtinCategoryNameById.get(symbolId))
    .filter((categoryName): categoryName is string => Boolean(categoryName))
    .map((categoryName) => builtinCategoryByName.get(categoryName)?.slug)
    .filter((slug): slug is string => Boolean(slug)))];

  await Promise.all(categorySlugs.map((slug) => loadBuiltinCategoryBySlug(slug)));

  return symbolIds
    .map((symbolId) => builtinSymbolsById.get(symbolId))
    .filter((symbol): symbol is SymbolDef => Boolean(symbol));
}

export function loadBuiltinSymbolCatalog(): Promise<GeneratedSymbolCatalogFile> {
  return loadBuiltinSymbols().then((symbols) => ({
    _meta: SYMBOL_CATALOG_META,
    symbols,
  }));
}

export async function loadBuiltinSymbols(): Promise<SymbolDef[]> {
  await Promise.all(builtinCatalogIndex.categories.map((category) => loadBuiltinCategoryBySlug(category.slug)));
  return getLoadedBuiltinSymbols();
}
