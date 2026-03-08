import { describe, it, expect } from "vitest";
import { BUILTIN_SYMBOLS } from "@/symbols";

describe("BUILTIN_SYMBOLS", () => {
  it("contains at least 10 symbols", () => {
    expect(BUILTIN_SYMBOLS.length).toBeGreaterThanOrEqual(10);
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

  it("all symbols have either a path or a generator", () => {
    for (const sym of BUILTIN_SYMBOLS) {
      const hasDef = sym.path || sym.generator;
      expect(hasDef).toBeTruthy();
    }
  });

  it("includes expected categories", () => {
    const categories = new Set(BUILTIN_SYMBOLS.map((s) => s.category));
    expect(categories).toContain("Stars");
    expect(categories).toContain("Crosses");
    expect(categories).toContain("Geometric");
    expect(categories).toContain("Plants");
  });

  it("star5 symbol uses generator instead of path", () => {
    const star5 = BUILTIN_SYMBOLS.find((s) => s.id === "star5");
    expect(star5).toBeDefined();
    expect(star5!.generator).toBe("star5");
    expect(star5!.path).toBeUndefined();
  });
});
