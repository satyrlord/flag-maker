import { readFile } from "node:fs/promises";

import { beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
import {
  BUILTIN_SYMBOLS,
  BUILTIN_SYMBOL_CATEGORIES,
  getLoadedBuiltinSymbols,
  getBuiltinSymbolCategoryName,
  loadBuiltinSymbolCatalog,
  loadBuiltinSymbols,
  loadBuiltinSymbolsForCategory,
} from "@/symbols";

describe("BUILTIN_SYMBOLS", () => {
  // All tests in this block access BUILTIN_SYMBOLS and verify the full 48-symbol
  // catalog, so beforeAll (load once) is more efficient than beforeEach (reload
  // per test). Scoped to this describe block -- does not affect other describes.
  beforeAll(async () => {
    await loadBuiltinSymbols();
  });

  it("contains the trimmed built-in symbol catalog used by templates", () => {
    expect(BUILTIN_SYMBOLS.length).toBe(48);
  });

  it("all symbols have unique ids", () => {
    const ids = BUILTIN_SYMBOLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all symbols have id, name, and category", () => {
    for (const sym of BUILTIN_SYMBOLS) {
      expect(sym.id).toBeTruthy();
      expect(sym.name).toBeTruthy();
      expect(sym.category).toBeTruthy();
    }
  });

  it("all symbols define exactly one of path, generator, or svg", () => {
    for (const sym of BUILTIN_SYMBOLS) {
      const definitionCount = [sym.path, sym.generator, sym.svg].filter(Boolean).length;
      expect(definitionCount).toBe(1);
    }
  });

  it("keeps only categories still used by templates", () => {
    const categories = [...new Set(BUILTIN_SYMBOLS.map((s) => s.category))];
    expect(categories).toEqual(BUILTIN_SYMBOL_CATEGORIES);
  });

  it("includes all 4 Korean trigrams", () => {
    const ids = BUILTIN_SYMBOLS.map((s) => s.id);
    expect(ids).toContain("trigram_geon");
    expect(ids).toContain("trigram_gon");
    expect(ids).toContain("trigram_ri");
    expect(ids).toContain("trigram_gam");
  });

  it("Sol de Mayo uses svg markup", () => {
    const sol = BUILTIN_SYMBOLS.find((s) => s.id === "sol_de_mayo");
    expect(sol).toBeDefined();
    expect(sol!.svg).toBeTruthy();
    expect(sol!.viewBox).toBeTruthy();
  });

  it("Ulster Banner uses svg markup", () => {
    const ulsterBanner = BUILTIN_SYMBOLS.find((s) => s.id === "ulster_banner_flag");
    expect(ulsterBanner).toBeDefined();
    expect(ulsterBanner!.svg).toBeTruthy();
    expect(ulsterBanner!.viewBox).toBe("0 0 600 300");
    expect(ulsterBanner!.svg).toContain('use href="#a"');
    expect(ulsterBanner!.svg).toContain('transform="matrix(0 .5 -1 0 450 0)"');
    expect(ulsterBanner!.svg).toContain('M296.663 22.53h6.252');
  });

  it("includes the corrected and newly added flag symbol artwork", () => {
    const albania = BUILTIN_SYMBOLS.find((s) => s.id === "albania_eagle");
    const wales = BUILTIN_SYMBOLS.find((s) => s.id === "wales_flag");
    const bavaria = BUILTIN_SYMBOLS.find((s) => s.id === "bavaria_lozengy_flag");
    const berlin = BUILTIN_SYMBOLS.find((s) => s.id === "berlin_flag");
    const brandenburg = BUILTIN_SYMBOLS.find((s) => s.id === "brandenburg_flag");
    const guernsey = BUILTIN_SYMBOLS.find((s) => s.id === "guernsey_flag");
    const hamburg = BUILTIN_SYMBOLS.find((s) => s.id === "hamburg_flag");
    const isleOfMan = BUILTIN_SYMBOLS.find((s) => s.id === "isle_of_man_flag");
    const jersey = BUILTIN_SYMBOLS.find((s) => s.id === "jersey_flag");
    const lowerSaxony = BUILTIN_SYMBOLS.find((s) => s.id === "lower_saxony_flag");
    const rhinelandPalatinate = BUILTIN_SYMBOLS.find((s) => s.id === "rhineland_palatinate_flag");
    const saarland = BUILTIN_SYMBOLS.find((s) => s.id === "saarland_flag");
    const sardinia = BUILTIN_SYMBOLS.find((s) => s.id === "sardinia_flag");
    const saxonyAnhalt = BUILTIN_SYMBOLS.find((s) => s.id === "saxony_anhalt_flag");
    const corsica = BUILTIN_SYMBOLS.find((s) => s.id === "corsica_flag");
    const venice = BUILTIN_SYMBOLS.find((s) => s.id === "venice_flag");

    expect(albania).toBeDefined();
    expect(albania!.category).toBe("Animals");

    expect(wales).toBeDefined();
    expect(wales!.category).toBe("Animals");
    expect(wales!.svg).toBeTruthy();
    expect(wales!.viewBox).toBe("0 0 800 480");
    expect(wales!.svg).toContain('stroke="#000"');
    expect(wales!.svg).not.toContain("#00A651");

    expect(bavaria).toBeDefined();
    expect(bavaria!.svg).toBeTruthy();
    expect(bavaria!.viewBox).toBe("0 0 1000 600");
    expect(bavaria!.svg).toContain('fill="#0098d4"');

    expect(berlin).toBeDefined();
    expect(berlin!.category).toBe("National Symbols");
    expect(berlin!.svg).toBeTruthy();
    expect(berlin!.viewBox).toBe("0 0 12150 7290");

    expect(brandenburg).toBeDefined();
    expect(brandenburg!.svg).toBeTruthy();
    expect(brandenburg!.viewBox).toBe("0 0 1000 600");

    expect(guernsey).toBeDefined();
    expect(guernsey!.svg).toBeTruthy();
    expect(guernsey!.viewBox).toBe("0 0 36 24");
    expect(guernsey!.svg).toContain("#f9dd16");

    expect(hamburg).toBeDefined();
    expect(hamburg!.svg).toBeTruthy();
    expect(hamburg!.viewBox).toBe("0 0 600 400");

    expect(isleOfMan).toBeDefined();
    expect(isleOfMan!.svg).toBeTruthy();
    expect(isleOfMan!.viewBox).toBe("0 0 600 300");

    expect(jersey).toBeDefined();
    expect(jersey!.svg).toBeTruthy();
    expect(jersey!.viewBox).toBe("0 0 1000 600");

    expect(lowerSaxony).toBeDefined();
    expect(lowerSaxony!.svg).toBeTruthy();
    expect(lowerSaxony!.viewBox).toBe("0 0 1150 750");

    expect(rhinelandPalatinate).toBeDefined();
    expect(rhinelandPalatinate!.svg).toBeTruthy();
    expect(rhinelandPalatinate!.viewBox).toBe("0 0 900 600");

    expect(saarland).toBeDefined();
    expect(saarland!.svg).toBeTruthy();
    expect(saarland!.viewBox).toBe("0 0 500 300");

    expect(sardinia).toBeDefined();
    expect(sardinia!.svg).toBeTruthy();

    expect(saxonyAnhalt).toBeDefined();
    expect(saxonyAnhalt!.svg).toBeTruthy();
    expect(saxonyAnhalt!.viewBox).toBe("0 0 1333.33 800");

    expect(corsica).toBeDefined();
    expect(corsica!.svg).toBeTruthy();

    expect(venice).toBeDefined();
    expect(venice!.svg).toBeTruthy();
  });

  it("star_five_pointed is categorized as Celestial and defines its viewport", () => {
    const star = BUILTIN_SYMBOLS.find((s) => s.id === "star_five_pointed");
    expect(star).toBeDefined();
    expect(star!.category).toBe("Celestial");
    expect(star!.viewBox).toBe("10 9 240 228");
    expect(star!.path).toBeTruthy();
  });

  it("replaces andorra_coa with andorra_emblem", () => {
    const ids = BUILTIN_SYMBOLS.map((s) => s.id);
    expect(ids).toContain("andorra_emblem");
    expect(ids).not.toContain("andorra_coa");
  });

  it("removes symbols that are not used by templates", () => {
    const ids = BUILTIN_SYMBOLS.map((s) => s.id);
    expect(ids).not.toContain("eagle_heraldic");
    expect(ids).not.toContain("jerusalem_cross");
    expect(ids).not.toContain("tryzub");
  });

  it("Lebanon cedar is stored without the flag background and uses currentColor", () => {
    const cedar = BUILTIN_SYMBOLS.find((s) => s.id === "cedar_lebanon");
    expect(cedar).toBeDefined();
    expect(cedar!.svg).toContain('fill="currentColor"');
    expect(cedar!.svg).not.toContain('M0 0h900v600H0z');
    expect(cedar!.svg).not.toContain('M0 150h900v300H0z');
  });
});

describe("public runtime symbol catalog", () => {
  it("keeps curated symbols and excludes known bad heraldic fetch regressions", async () => {
    const runtimeSymbols = JSON.parse(await readFile("public/symbols.json", "utf8")) as Array<{
      id: string;
      svg?: string;
      viewBox?: string;
    }>;

    const runtimeIds = runtimeSymbols.map((symbol) => symbol.id);
    expect(runtimeIds).not.toContain("double_headed_eagle");
    expect(runtimeIds).not.toContain("eagle_heraldic");

    const tryzub = runtimeSymbols.find((symbol) => symbol.id === "tryzub");
    expect(tryzub).toBeDefined();
    expect(tryzub!.viewBox).toBe("-60 12 120 201");
    expect(tryzub!.svg).toContain('use href="#tryzub-half"');
    expect(tryzub!.svg).not.toContain("xlink:href");
    expect(tryzub!.svg).not.toContain("#005BBB");

    const cedar = runtimeSymbols.find((symbol) => symbol.id === "cedar_lebanon");
    expect(cedar).toBeDefined();
    expect(cedar!.svg).toContain('fill="currentColor"');
    expect(cedar!.svg).not.toContain('M0 0h900v600H0z');
    expect(cedar!.svg).not.toContain('M0 150h900v300H0z');

    const lionRampant = runtimeSymbols.find((symbol) => symbol.id === "lion_rampant") as
      | { category?: string }
      | undefined;
    expect(lionRampant).toBeDefined();
    expect(lionRampant!.category).toBe("Animals");
  });
});

describe("built-in symbol catalog loading", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads the full catalog without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const symbols = await import("@/symbols");

    const catalog = await symbols.loadBuiltinSymbolCatalog();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(catalog.symbols).toEqual(symbols.BUILTIN_SYMBOLS);
    expect(catalog.symbols).toHaveLength(48);
    expect(await symbols.loadBuiltinSymbols()).toEqual(symbols.BUILTIN_SYMBOLS);
  });

  it("loads and caches a single category on demand", async () => {
    const symbols = await import("@/symbols");

    expect(symbols.BUILTIN_SYMBOLS).toHaveLength(0);

    const firstLoad = await symbols.loadBuiltinSymbolsForCategory("Celestial");
    const secondLoad = await symbols.loadBuiltinSymbolsForCategory("Celestial");

    expect(firstLoad).toEqual(secondLoad);
    expect(firstLoad).toHaveLength(5);
    expect(firstLoad.every((symbol) => symbol.category === "Celestial")).toBe(true);
    expect(symbols.getLoadedBuiltinSymbols()).toEqual(firstLoad);
  });

  it("loads only the categories required for a symbol id set", async () => {
    const symbols = await import("@/symbols");

    const requestedIds = ["cedar_lebanon", "sol_de_mayo", "star_five_pointed"];
    const loaded = await symbols.ensureBuiltinSymbolsByIds(requestedIds);

    expect(loaded.map((symbol) => symbol.id)).toEqual(requestedIds);
    expect(new Set(symbols.getLoadedBuiltinSymbols().map((symbol) => symbol.category))).toEqual(
      new Set(["Plants", "Celestial"]),
    );
  });

  it("returns an empty array for an unknown category", async () => {
    const symbols = await import("@/symbols");

    await expect(symbols.loadBuiltinSymbolsForCategory("Unknown Category")).resolves.toEqual([]);
  });

  it("maps symbol ids back to their generated category", async () => {
    expect(getBuiltinSymbolCategoryName("sol_de_mayo")).toBe("Celestial");
    expect(getBuiltinSymbolCategoryName("cedar_lebanon")).toBe("Plants");
    expect(getBuiltinSymbolCategoryName("missing_symbol")).toBeUndefined();
  });

});

