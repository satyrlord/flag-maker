import { beforeEach, describe, it, expect, vi } from "vitest";
import { BUILTIN_SYMBOLS } from "@/symbols";

describe("BUILTIN_SYMBOLS", () => {
  it("contains the trimmed built-in symbol catalog used by templates", () => {
    expect(BUILTIN_SYMBOLS.length).toBe(32);
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
    expect(categories).toEqual([
      "Celestial",
      "Cultural",
      "Plants",
      "Animals",
      "Geometric",
      "National Symbols",
    ]);
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

describe("built-in symbol catalog loading", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns the preloaded catalog in test mode without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const symbols = await import("@/symbols");

    const catalog = await symbols.loadBuiltinSymbolCatalog();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(catalog.symbols).toEqual(symbols.BUILTIN_SYMBOLS);
    expect(await symbols.loadBuiltinSymbols()).toEqual(symbols.BUILTIN_SYMBOLS);
  });

  it("fetches and caches the catalog when the preloaded array is empty", async () => {
    const symbols = await import("@/symbols");
    symbols.BUILTIN_SYMBOLS.length = 0;

    const fetchedCatalog = {
      _meta: { generatedAt: "2026-03-14T00:00:00.000Z", generatedBy: "test" },
      symbols: [{ id: "remote_symbol", name: "Remote", category: "Test", path: "M0 0Z" }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fetchedCatalog),
    } as Response);

    const firstLoad = await symbols.loadBuiltinSymbolCatalog();
    const secondLoad = await symbols.loadBuiltinSymbolCatalog();

    expect(firstLoad).toEqual(fetchedCatalog);
    expect(secondLoad).toEqual(fetchedCatalog);
    expect(await symbols.loadBuiltinSymbols()).toEqual(fetchedCatalog.symbols);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("symbols-catalog.generated.json"), {
      cache: "force-cache",
    });
  });

  it("throws when fetching the catalog fails", async () => {
    const symbols = await import("@/symbols");
    symbols.BUILTIN_SYMBOLS.length = 0;

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    await expect(symbols.loadBuiltinSymbolCatalog()).rejects.toThrow(
      "Failed to load built-in symbol catalog: 503 Service Unavailable",
    );
  });
});
