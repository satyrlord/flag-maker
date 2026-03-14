import { describe, expect, it } from "vitest";

import { pruneRuntimeSymbolCatalog } from "../../tools/prune-runtime-symbols";

describe("prune-runtime-symbols tool", () => {
  it("removes coat-of-arms entries that are not template-enabled", () => {
    const result = pruneRuntimeSymbolCatalog([
      { id: "andorra_emblem", category: "Coat of Arms", name: "Andorra" },
      { id: "unused_emblem", category: "Coat of Arms", name: "Unused" },
      { id: "custom_symbol", category: "Custom", name: "Custom" },
    ]);

    expect(result).toEqual([
      { id: "andorra_emblem", category: "Coat of Arms", name: "Andorra" },
      { id: "custom_symbol", category: "Custom", name: "Custom" },
    ]);
  });
});