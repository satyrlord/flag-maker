import type { SymbolDef } from "./types";
import flagConfigs from "./config/un-flags.json";

interface TemplateOverlayConfig {
  type?: string;
  symbolId?: string;
}

interface TemplateFlagConfig {
  overlays?: TemplateOverlayConfig[];
}

// These symbols are referenced by TypeScript template factories (src/templates.ts
// and the built-in template catalog) that are not generated from un-flags.json.
// They cannot be automatically derived by scanning overlay configs, so they are
// listed explicitly here to ensure they are included in the runtime symbol filter
// and the built-in symbol catalog.
export const HARDCODED_TEMPLATE_SYMBOL_IDS = [
  "wales_flag",
  "ulster_banner_flag",
  "bavaria_lozengy_flag",
  "guernsey_flag",
  "sardinia_flag",
  "corsica_flag",
  "venice_flag",
  "jersey_flag",
  "isle_of_man_flag",
  "berlin_flag",
  "brandenburg_flag",
  "hamburg_flag",
  "lower_saxony_flag",
  "rhineland_palatinate_flag",
  "saarland_flag",
  "saxony_anhalt_flag",
  "star_five_pointed",
] as const;

// Keep this empty by default. Add ids here when a coat of arms should stay available
// in the picker even if no current template references it yet.
const RUNTIME_SYMBOL_ENABLE_OVERRIDES: readonly string[] = [];

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

/**
 * Returns true if a runtime symbol should be included in the picker.
 *
 * All categories are enabled by default except "Coat of Arms": heraldic coat
 * of arms symbols are high-maintenance and often too detailed for small flag
 * thumbnails, so they are gated behind explicit opt-in via
 * `RUNTIME_SYMBOL_ENABLE_OVERRIDES` or template usage (`TEMPLATE_SYMBOL_IDS`).
 */
function isRuntimeSymbolEnabled(symbol: Pick<SymbolDef, "id" | "category">): boolean {
  if (symbol.category !== "Coat of Arms") {
    return true;
  }

  return ENABLED_RUNTIME_SYMBOL_IDS.has(symbol.id);
}

export function pruneRuntimeSymbols<T extends Pick<SymbolDef, "id" | "category">>(symbols: readonly T[]): T[] {
  return symbols.filter(isRuntimeSymbolEnabled);
}