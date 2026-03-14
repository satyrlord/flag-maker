import type { SymbolDef } from "./types";
import flagConfigs from "./config/un-flags.json";

interface TemplateOverlayConfig {
  type?: string;
  symbolId?: string;
}

interface TemplateFlagConfig {
  overlays?: TemplateOverlayConfig[];
}

const HARDCODED_TEMPLATE_SYMBOL_IDS = [
  "dragon_heraldic",
  "sol_de_mayo",
  "star_five_pointed",
] as const;

// Keep this empty by default. Add ids here when a coat of arms should stay available
// in the picker even if no current template references it yet.
export const RUNTIME_SYMBOL_ENABLE_OVERRIDES: readonly string[] = [];

function collectConfiguredTemplateSymbolIds(): Set<string> {
  const ids = new Set<string>(HARDCODED_TEMPLATE_SYMBOL_IDS);

  for (const flag of flagConfigs as TemplateFlagConfig[]) {
    for (const overlay of flag.overlays ?? []) {
      if (overlay.type !== "symbol" || typeof overlay.symbolId !== "string" || overlay.symbolId.length === 0) {
        continue;
      }
      ids.add(overlay.symbolId);
    }
  }

  return ids;
}

export const TEMPLATE_SYMBOL_IDS = collectConfiguredTemplateSymbolIds();

export const ENABLED_RUNTIME_SYMBOL_IDS = new Set<string>([
  ...TEMPLATE_SYMBOL_IDS,
  ...RUNTIME_SYMBOL_ENABLE_OVERRIDES,
]);

export function isRuntimeSymbolEnabled(symbol: Pick<SymbolDef, "id" | "category">): boolean {
  if (symbol.category !== "Coat of Arms") {
    return true;
  }

  return ENABLED_RUNTIME_SYMBOL_IDS.has(symbol.id);
}

export function pruneRuntimeSymbols<T extends Pick<SymbolDef, "id" | "category">>(symbols: readonly T[]): T[] {
  return symbols.filter(isRuntimeSymbolEnabled);
}