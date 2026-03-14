/* ──────────────────────────────────────────────
   Flag Maker – Built-in Symbols
   ────────────────────────────────────────────── */

import type { SymbolDef } from "./types";

export interface GeneratedSymbolCatalogFile {
  _meta: {
    generatedAt: string;
    generatedBy: string;
  };
  symbols: SymbolDef[];
}

const EMPTY_CATALOG_META: GeneratedSymbolCatalogFile["_meta"] = {
  generatedAt: "",
  generatedBy: "",
};
const symbolsCatalogUrl = new URL("./config/symbols-catalog.generated.json", import.meta.url).href;
const isTestMode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE === "test";

let builtinSymbols: SymbolDef[] = [];
let symbolCatalogMeta: GeneratedSymbolCatalogFile["_meta"] = EMPTY_CATALOG_META;

if (isTestMode) {
  const testCatalog = (await import("./config/symbols-catalog.generated.json")).default as GeneratedSymbolCatalogFile;
  builtinSymbols = testCatalog.symbols;
  symbolCatalogMeta = testCatalog._meta;
}

let builtinCatalogPromise: Promise<GeneratedSymbolCatalogFile> | null = null;

async function fetchBuiltinSymbolCatalog(): Promise<GeneratedSymbolCatalogFile> {
  if (builtinSymbols.length > 0) {
    return { _meta: symbolCatalogMeta, symbols: builtinSymbols };
  }

  const response = await fetch(symbolsCatalogUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load built-in symbol catalog: ${response.status} ${response.statusText}`);
  }

  const catalog = await response.json() as GeneratedSymbolCatalogFile;
  builtinSymbols = catalog.symbols;
  symbolCatalogMeta = catalog._meta;
  return catalog;
}

export const SYMBOL_CATALOG_META = symbolCatalogMeta;
export const BUILTIN_SYMBOLS: SymbolDef[] = builtinSymbols;

export function loadBuiltinSymbolCatalog(): Promise<GeneratedSymbolCatalogFile> {
  if (!builtinCatalogPromise) {
    builtinCatalogPromise = fetchBuiltinSymbolCatalog();
  }
  return builtinCatalogPromise;
}

export async function loadBuiltinSymbols(): Promise<SymbolDef[]> {
  return (await loadBuiltinSymbolCatalog()).symbols;
}
