import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllSymbols, loadSymbolsJson, sanitizeImportedSvgMarkup } from "@/symbolLoader";
import { BUILTIN_SYMBOLS } from "@/symbols";

describe("sanitizeImportedSvgMarkup", () => {
  it("removes metadata, comments, and empty defs from imported markup", () => {
    const dirtySvg = `
      <!-- source comment -->
      <metadata>
        <rdf:RDF>
          <cc:Work />
        </rdf:RDF>
      </metadata>
      <defs></defs>
      <g><circle cx="10" cy="10" r="8" /></g>
    `;

    expect(sanitizeImportedSvgMarkup(dirtySvg)).toBe("<g><circle cx=\"10\" cy=\"10\" r=\"8\" /></g>");
  });

  it("preserves populated defs blocks and keeps multicolor paint intact", () => {
    const importedSvg = `
      <defs><path id="crest" d="M0 0Z" /></defs>
      <use href="#crest" fill="#fedf00" stroke="#112233" />
      <path style="fill:#abcdef;stroke:#654321;stroke-width:2" d="M1 1Z" />
    `;

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      "<defs><path id=\"crest\" d=\"M0 0Z\" /></defs> <use href=\"#crest\" fill=\"#fedf00\" stroke=\"#112233\" /> <path style=\"fill:#abcdef;stroke:#654321;stroke-width:2\" d=\"M1 1Z\" />",
    );
  });

  it("repairs orphan defs closures so referenced helper shapes do not render directly", () => {
    const importedSvg = [
      '<path d="M0 0H10" fill="#123456"/>',
      '<use xlink:href="#helper" fill="#abcdef"/>',
      '<path id="helper" d="M1 1H9" fill="#abcdef"/>',
      '</defs>',
    ].join("");

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<defs><path id="helper" d="M1 1H9" fill="#abcdef"/></defs><path d="M0 0H10" fill="#123456"/><use xlink:href="#helper" fill="#abcdef"/>',
    );
  });

  it("leaves stray defs closures untouched when there are no references", () => {
    const importedSvg = '<path d="M0 0H10" fill="#123456"/></defs>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path d="M0 0H10" fill="currentColor"/></defs>',
    );
  });

  it("leaves stray defs closures untouched when the referenced id is missing", () => {
    const importedSvg = '<use href="#helper" fill="#abcdef"/><path id="other" d="M1 1H9" fill="#abcdef"/></defs>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<use href="#helper" fill="currentColor"/><path id="other" d="M1 1H9" fill="currentColor"/></defs>',
    );
  });

  it("leaves stray defs closures untouched when the closing defs appears before the referenced element", () => {
    const importedSvg = '<use href="#helper" fill="#abcdef"/></defs><path id="helper" d="M1 1H9" fill="#abcdef"/>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<use href="#helper" fill="currentColor"/></defs><path id="helper" d="M1 1H9" fill="currentColor"/>',
    );
  });

  it("normalizes paint to currentColor only for monochrome imported markup", () => {
    const importedSvg = `
      <defs><path id="crest" d="M0 0Z" /></defs>
      <use href="#crest" fill="#fedf00" stroke="#FEDF00" />
      <path style="fill:#fedf00;stroke:#fedf00;stroke-width:2" d="M1 1Z" />
    `;

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      "<defs><path id=\"crest\" d=\"M0 0Z\" /></defs> <use href=\"#crest\" fill=\"currentColor\" stroke=\"currentColor\" /> <path style=\"fill: currentColor; stroke: currentColor; stroke-width: 2\" d=\"M1 1Z\" />",
    );
  });

  it("preserves non-tintable paint values such as none, transparent, gradients, CSS vars, and currentColor", () => {
    const importedSvg = `
      <path fill="none" stroke="transparent" style="fill: var(--accent); stroke: currentColor; marker: none" />
    `;

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      "<path fill=\"none\" stroke=\"transparent\" style=\"fill: var(--accent); stroke: currentColor; marker: none\" />",
    );
  });

  it("preserves !important while converting tintable paint values", () => {
    const importedSvg = `<path style="fill: #abcdef !important; stroke: #654321 !important" />`;

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      "<path style=\"fill: #abcdef !important; stroke: #654321 !important\" />",
    );
  });

  it("preserves !important when the imported symbol is monochrome", () => {
    const importedSvg = `<path style="fill: #abcdef !important; stroke: #ABCDEF !important" />`;

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      "<path style=\"fill: currentColor !important; stroke: currentColor !important\" />",
    );
  });

  it("normalizes equivalent short and long hex paint values as monochrome", () => {
    const importedSvg = '<path fill="#abc" stroke="#AABBCC" />';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path fill="currentColor" stroke="currentColor" />',
    );
  });

  it("normalizes equivalent rgb paint values despite whitespace differences", () => {
    const importedSvg = '<path fill="rgb(12, 34, 56)" style="stroke: rgb(12,34,56)" />';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path fill="currentColor" style="stroke: currentColor" />',
    );
  });

  it("normalizes named colors through the DOM color parser when they are monochrome", () => {
    const importedSvg = '<path fill="red" stroke="red" />';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path fill="currentColor" stroke="currentColor" />',
    );
  });

  it("preserves non-tintable style properties when monochrome normalization runs", () => {
    const importedSvg = '<path style="fill: #abcdef; stroke: #abcdef; opacity: 0.5" />';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path style="fill: currentColor; stroke: currentColor; opacity: 0.5" />',
    );
  });

  it("strips script elements from imported markup", () => {
    const importedSvg = '<circle cx="10" cy="10" r="8" fill="#abcdef"/><script>alert(1)</script>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<circle cx="10" cy="10" r="8" fill="currentColor"/>',
    );
  });

  it("strips script elements with attributes from imported markup", () => {
    const importedSvg = '<rect fill="#abcdef"/><script type="text/javascript">document.cookie="x"</script>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<rect fill="currentColor"/>',
    );
  });

  it("strips inline event handler attributes from imported markup", () => {
    const importedSvg = '<circle cx="10" cy="10" r="8" fill="#abcdef" onload="alert(1)"/>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<circle cx="10" cy="10" r="8" fill="currentColor"/>',
    );
  });

  it("strips multiple event handler attributes from a single element", () => {
    const importedSvg = '<rect fill="#abcdef" onclick="steal()" onmouseover="track()" width="10"/>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<rect fill="currentColor" width="10"/>',
    );
  });

  it("strips javascript: href values from imported markup", () => {
    // The SVG is monochrome (#abcdef), so fill is also normalised to currentColor.
    const importedSvg = '<a href="javascript:alert(1)" fill="#abcdef"><circle r="8"/></a>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<a fill="currentColor"><circle r="8"/></a>',
    );
  });

  it("strips xlink:href with javascript: scheme from imported markup", () => {
    // The SVG is monochrome (#abcdef), so fill is also normalised to currentColor.
    const importedSvg = '<a xlink:href="javascript:void(0)" fill="#abcdef"><rect width="10"/></a>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<a fill="currentColor"><rect width="10"/></a>',
    );
  });

  it("strips all three security threats when combined", () => {
    const importedSvg = [
      '<rect fill="#abcdef" onclick="steal()"/>',
      '<a href="javascript:alert(1)"><circle r="5"/></a>',
      '<script>document.location="http://evil.example"</script>',
    ].join("");

    const result = sanitizeImportedSvgMarkup(importedSvg);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("<script");
    expect(result).toContain("<rect");
    expect(result).toContain("<circle");
  });

  it("falls back to the raw value when the DOM color parser cannot parse the color", () => {
    // '#zzz' is not a valid hex color; jsdom leaves sample.style.color empty,
    // hitting the 'return compactValue' fallback (line 99).
    // Because it is the only tintable-looking paint, monochrome normalization
    // then converts it to currentColor via normalizePaintValue.
    const importedSvg = '<path fill="#zzz"/>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe('<path fill="currentColor"/>');
  });

  it("preserves a non-tintable style value when it appears alongside a tintable one in a monochrome SVG", () => {
    // fill:none is non-tintable; stroke:#abcdef is tintable (monochrome set size=1).
    // normalizePaintValue('none') hits the !isTintablePaintValue branch (line 147)
    // and returns the value unchanged, while stroke is converted to currentColor.
    const importedSvg = '<path fill="#abcdef" style="fill: none; stroke: #abcdef"/>';

    expect(sanitizeImportedSvgMarkup(importedSvg)).toBe(
      '<path fill="currentColor" style="fill: none; stroke: currentColor"/>',
    );
  });
});

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

  it("deduplicates overlapping ids and keeps the remote symbol definition", () => {
    const remote = [{
      id: "tryzub",
      name: "Remote Tryzub",
      category: "Custom",
      path: "M1 1Z",
    }];
    const result = getAllSymbols(remote);
    expect(result.filter((symbol) => symbol.id === "tryzub")).toHaveLength(1);
    expect(result.find((symbol) => symbol.id === "tryzub")?.name).toBe("Remote Tryzub");
  });
});

describe("loadSymbolsJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty symbols and status on fetch failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
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
      { id: "s2", name: "Symbol 2", category: "Test", svg: "<metadata>x</metadata><defs></defs><circle fill=\"#123456\"/><path stroke=\"#123456\" d=\"M0 0Z\"/>" },
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
    expect(result.symbols[1].svg).toBe("<circle fill=\"currentColor\"/><path stroke=\"currentColor\" d=\"M0 0Z\"/>");
    expect(result.status).toMatch(/Loaded 2/);
  });

  it("does not apply additional runtime pruning when reading the generated artifact", async () => {
    const mockData = [
      { id: "andorra_emblem", name: "Andorra Emblem", category: "Coat of Arms", path: "M0 0Z" },
      { id: "unused_emblem", name: "Unused Emblem", category: "Coat of Arms", path: "M1 1Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");

    expect(result.symbols.map((symbol) => symbol.id)).toEqual(["andorra_emblem", "unused_emblem"]);
    expect(result.status).toMatch(/Loaded 2 symbols/i);
  });

  it("keeps non-coat runtime categories even when they are not referenced by templates", async () => {
    const mockData = [
      { id: "custom_symbol", name: "Custom Symbol", category: "Custom", path: "M0 0Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");

    expect(result.symbols.map((symbol) => symbol.id)).toEqual(["custom_symbol"]);
  });

  it("preserves multicolor imported svg markup when loading symbols", async () => {
    const mockData = [
      {
        id: "multicolor",
        name: "Multicolor",
        category: "Test",
        svg: "<circle fill=\"#123456\"/><path stroke=\"#abcdef\" d=\"M0 0Z\"/>",
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await loadSymbolsJson("/");
    expect(result.symbols[0].svg).toBe("<circle fill=\"#123456\"/><path stroke=\"#abcdef\" d=\"M0 0Z\"/>");
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
