import { describe, expect, it } from "vitest";

import { ALL_TEMPLATE_FACTORIES } from "@/templateCatalog";
import {
  ENABLED_RUNTIME_SYMBOL_IDS,
  HARDCODED_TEMPLATE_SYMBOL_IDS,
  TEMPLATE_SYMBOL_IDS,
  pruneRuntimeSymbols,
} from "@/templateSymbolIds";
import flagConfigs from "@/config/un-flags.json";

describe("template runtime symbol pruning", () => {
  it("collects template symbol ids used by config and hardcoded templates", () => {
    expect(TEMPLATE_SYMBOL_IDS.has("andorra_emblem")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("wales_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("ulster_banner_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("bavaria_lozengy_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("guernsey_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("jersey_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("isle_of_man_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("berlin_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("brandenburg_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("hamburg_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("lower_saxony_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("rhineland_palatinate_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("saarland_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("saxony_anhalt_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("sardinia_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("corsica_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("venice_flag")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("star_five_pointed")).toBe(true);
  });

  it("keeps only template-enabled coat-of-arms entries", () => {
    const pruned = pruneRuntimeSymbols([
      { id: "andorra_emblem", category: "Coat of Arms" },
      { id: "unused_emblem", category: "Coat of Arms" },
      { id: "custom_symbol", category: "Custom" },
    ]);

    expect(pruned).toEqual([
      { id: "andorra_emblem", category: "Coat of Arms" },
      { id: "custom_symbol", category: "Custom" },
    ]);
  });

  it("exposes the enabled runtime ids used for build-time pruning", () => {
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("andorra_emblem")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("wales_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("ulster_banner_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("guernsey_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("jersey_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("isle_of_man_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("berlin_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("brandenburg_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("hamburg_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("lower_saxony_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("rhineland_palatinate_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("saarland_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("saxony_anhalt_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("sardinia_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("corsica_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("venice_flag")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("unused_emblem")).toBe(false);
  });
});

describe("HARDCODED_TEMPLATE_SYMBOL_IDS completeness", () => {
  it("covers every symbolId used by TypeScript template factories", () => {
    const factorySymbolIds = new Set<string>();
    for (const factory of Object.values(ALL_TEMPLATE_FACTORIES)) {
      for (const overlay of factory().overlays) {
        if (overlay.type === "symbol" && overlay.symbolId) {
          factorySymbolIds.add(overlay.symbolId);
        }
      }
    }

    const missing = [...factorySymbolIds].filter((id) => !TEMPLATE_SYMBOL_IDS.has(id));
    expect(missing, `Symbol IDs used in factories but missing from HARDCODED_TEMPLATE_SYMBOL_IDS: ${missing.join(", ")}`).toEqual([]);
  });

  it("contains no entries already derivable from un-flags.json configs", () => {
    // IDs in HARDCODED that also appear in un-flags.json overlay configs are
    // redundant: collectConfiguredTemplateSymbolIds() would include them anyway.
    // Entries only needed by unregistered TypeScript factories (e.g. templateDRC)
    // are intentionally hardcoded and are not considered stale by this check.
    const configSymbolIds = new Set<string>();
    for (const flag of flagConfigs as Array<{ overlays?: Array<{ type?: string; symbolId?: string }> }>) {
      for (const overlay of flag.overlays ?? []) {
        if (overlay.type === "symbol" && typeof overlay.symbolId === "string") {
          configSymbolIds.add(overlay.symbolId);
        }
      }
    }

    const redundant = HARDCODED_TEMPLATE_SYMBOL_IDS.filter((id) => configSymbolIds.has(id));
    expect(redundant, `HARDCODED_TEMPLATE_SYMBOL_IDS entries already derivable from un-flags.json: ${redundant.join(", ")}`).toEqual([]);
  });
});