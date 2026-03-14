import { describe, expect, it } from "vitest";

import {
  ENABLED_RUNTIME_SYMBOL_IDS,
  TEMPLATE_SYMBOL_IDS,
  pruneRuntimeSymbols,
} from "@/templateSymbolIds";

describe("template runtime symbol pruning", () => {
  it("collects template symbol ids used by config and hardcoded templates", () => {
    expect(TEMPLATE_SYMBOL_IDS.has("andorra_emblem")).toBe(true);
    expect(TEMPLATE_SYMBOL_IDS.has("dragon_heraldic")).toBe(true);
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
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("dragon_heraldic")).toBe(true);
    expect(ENABLED_RUNTIME_SYMBOL_IDS.has("unused_emblem")).toBe(false);
  });
});