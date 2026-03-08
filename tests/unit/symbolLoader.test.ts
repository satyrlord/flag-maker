import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllSymbols, loadSymbolsJson } from "@/symbolLoader";
import { BUILTIN_SYMBOLS } from "@/symbols";

describe("getAllSymbols", () => {
  it("returns builtins when no remote symbols", () => {
    const result = getAllSymbols([]);
    expect(result).toEqual(BUILTIN_SYMBOLS);
  });

  it("merges remote symbols after builtins", () => {
    const remote = [{ id: "test", name: "Test", category: "Custom", path: "M0 0Z" }];
    const result = getAllSymbols(remote);
    expect(result.length).toBe(BUILTIN_SYMBOLS.length + 1);
    expect(result[result.length - 1].id).toBe("test");
  });
});

describe("loadSymbolsJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty symbols and status on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const result = await loadSymbolsJson("/");
    expect(result.symbols).toEqual([]);
    expect(result.status).toMatch(/Failed/i);
  });

  it("returns empty symbols on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);
    const result = await loadSymbolsJson("/");
    expect(result.symbols).toEqual([]);
    expect(result.status).toMatch(/No.*symbols\.json/i);
  });

  it("parses valid symbols from response", async () => {
    const mockData = [
      { id: "s1", name: "Symbol 1", category: "Test", path: "M0 0Z" },
      { id: "s2", name: "Symbol 2", category: "Test", svg: "<circle/>" },
      { bad: true }, // should be filtered out
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/base/");
    expect(result.symbols).toHaveLength(2);
    expect(result.symbols[0].id).toBe("s1");
    expect(result.symbols[1].id).toBe("s2");
    expect(result.status).toMatch(/Loaded 2/);
  });

  it("falls back to id when name is missing", async () => {
    const mockData = [
      { id: "noname", name: "", category: "Cat", path: "M0 0Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].name).toBe("noname");
  });

  it("falls back to Imported when category is missing", async () => {
    const mockData = [
      { id: "nocat", name: "NoCat", category: "", path: "M0 0Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].category).toBe("Imported");
  });

  it("maps viewBox when present as string", async () => {
    const mockData = [
      { id: "vb", name: "VB", category: "Test", path: "M0 0Z", viewBox: "0 0 200 200" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].viewBox).toBe("0 0 200 200");
  });

  it("maps generator star5 when present", async () => {
    const mockData = [
      { id: "star", name: "Star", category: "Stars", generator: "star5" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].generator).toBe("star5");
  });

  it("sets viewBox and generator to undefined when not valid", async () => {
    const mockData = [
      { id: "x", name: "X", category: "Cat", path: "M0 0Z", viewBox: 123, generator: "other" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].viewBox).toBeUndefined();
    expect(result.symbols[0].generator).toBeUndefined();
  });

  it("requests the correct URL with the given base", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    await loadSymbolsJson("/my-app/");
    expect(fetchSpy).toHaveBeenCalledWith("/my-app/symbols.json", { cache: "no-store" });
  });
});
