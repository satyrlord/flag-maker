import { describe, expect, it } from "vitest";
import {
  ALL_TEMPLATE_FACTORIES,
  buildTemplateCatalog,
  getTemplateFactory,
  resolveNationalTemplateEntries,
  TEMPLATE_CATALOG,
  TEMPLATE_GROUPED_CONFIGS,
  validateTemplateCatalog,
} from "@/templateCatalog";
import leftbarConfig from "@/config/leftbar-config.json";

describe("templateCatalog", () => {
  it("resolves national entry names from the national template map", () => {
    expect(resolveNationalTemplateEntries([{ id: "france" }])).toEqual([{ id: "france", name: "France" }]);
  });

  it("rejects an unknown national template id", () => {
    expect(() => resolveNationalTemplateEntries([{ id: "not_a_country" }])).toThrow(/unknown national template id/i);
  });

  it("finds factories for division, national, and state-level templates", () => {
    expect(getTemplateFactory("perPale")).toBeTypeOf("function");
    expect(getTemplateFactory("france")).toBeTypeOf("function");
    expect(getTemplateFactory("wales")).toBeTypeOf("function");
    expect(getTemplateFactory("missing_template")).toBeUndefined();
  });

  it("builds a catalog entry for state-level templates", () => {
    const entry = TEMPLATE_CATALOG.find((candidate) => candidate.id === "wales");
    expect(entry).toBeDefined();
    expect(entry?.group).toBe("State Level");
    expect(entry?.create().overlays.some((overlay) => overlay.type === "symbol")).toBe(true);
  });

  it("rejects duplicate template groups", () => {
    const invalid = [...TEMPLATE_GROUPED_CONFIGS, TEMPLATE_GROUPED_CONFIGS[0]];
    expect(() => validateTemplateCatalog(leftbarConfig.templateGroups, invalid, ALL_TEMPLATE_FACTORIES)).toThrow(/duplicate groups/i);
  });

  it("rejects a declared group with no entries", () => {
    const invalid = TEMPLATE_GROUPED_CONFIGS.map((group) =>
      group.group === "State Level" ? { ...group, entries: [] } : group,
    );
    expect(() => validateTemplateCatalog(leftbarConfig.templateGroups, invalid, ALL_TEMPLATE_FACTORIES)).toThrow(/has no templates/i);
  });

  it("rejects duplicate template ids across groups", () => {
    const invalid = TEMPLATE_GROUPED_CONFIGS.map((group) =>
      group.group === "State Level"
        ? { ...group, entries: [...group.entries, { id: "france", name: "France Copy" }] }
        : group,
    );
    expect(() => validateTemplateCatalog(leftbarConfig.templateGroups, invalid, ALL_TEMPLATE_FACTORIES)).toThrow(/duplicate template id/i);
  });

  it("rejects catalog entries without a registered factory", () => {
    expect(() =>
      buildTemplateCatalog([{ group: "Division", entries: [{ id: "missing", name: "Missing" }] }]),
    ).toThrow(/missing factory/i);
  });
});