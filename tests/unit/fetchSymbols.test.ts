import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildSvgDocument,
  extractInnerSvgFromRaw,
  normalizeCategoryKey,
  planSourceSymbolUpsert,
  type SourceCatalogState,
  type SymbolSourceEntry,
} from "../../tools/fetch-symbols";

function createState(entries: SymbolSourceEntry[] = []): SourceCatalogState {
  return {
    config: {
      metadataFiles: [
        "symbols/metadata/celestial.json",
        "symbols/metadata/national-symbols.json",
      ],
      svgDirectory: "symbols/svg",
      outputFile: "symbols-catalog.generated.json",
    },
    configDir: path.join("src", "config"),
    metadataFiles: [
      {
        absolutePath: path.join("src", "config", "symbols", "metadata", "celestial.json"),
        entries,
      },
      {
        absolutePath: path.join("src", "config", "symbols", "metadata", "national-symbols.json"),
        entries: [],
      },
    ],
    fileIndexByCategory: new Map([
      ["celestial", 0],
      ["national-symbols", 1],
    ]),
    entryById: new Map(
      entries.map((entry, entryIndex) => [
        entry.id,
        { fileIndex: 0, entryIndex, entry },
      ]),
    ),
  };
}

describe("fetch-symbols helpers", () => {
  it("normalizes category names to metadata keys", () => {
    expect(normalizeCategoryKey("National Symbols")).toBe("national-symbols");
    expect(normalizeCategoryKey("  Celestial ")).toBe("celestial");
  });

  it("extracts inner SVG markup and viewBox from raw SVG", () => {
    const extracted = extractInnerSvgFromRaw(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"><g><path d="M0 0"/></g></svg>',
    );

    expect(extracted).toEqual({
      viewBox: "0 0 10 20",
      inner: '<g><path d="M0 0"/></g>',
    });
  });

  it("falls back to width and height when viewBox is missing", () => {
    const extracted = extractInnerSvgFromRaw(
      '<svg width="300px" height="150px"><path d="M0 0"/></svg>',
    );

    expect(extracted).toEqual({
      viewBox: "0 0 300 150",
      inner: '<path d="M0 0"/>',
    });
  });

  it("plans updates in place for existing source symbols", () => {
    const state = createState([
      {
        id: "sol_de_mayo",
        name: "Sol de Mayo",
        category: "Celestial",
        svgFile: "sol_de_mayo.svg",
      },
    ]);

    const plan = planSourceSymbolUpsert(state, {
      id: "sol_de_mayo",
      name: "Sol de Mayo",
      category: "Celestial",
      source: "https://example.test/sol",
      license: "Public domain",
    });

    expect(plan.isUpdate).toBe(true);
    expect(plan.fileIndex).toBe(0);
    expect(plan.entryIndex).toBe(0);
    expect(plan.svgOutputPath).toBe(path.join("src", "config", "symbols", "svg", "sol_de_mayo.svg"));
  });

  it("plans new entries into the normalized category metadata file", () => {
    const state = createState();

    const plan = planSourceSymbolUpsert(state, {
      id: "state_seal",
      name: "State Seal",
      category: "National Symbols",
      source: "https://example.test/seal",
      license: "CC0",
    });

    expect(plan.isUpdate).toBe(false);
    expect(plan.fileIndex).toBe(1);
    expect(plan.entryIndex).toBe(0);
    expect(plan.metadataOutputPath).toBe(
      path.join("src", "config", "symbols", "metadata", "national-symbols.json"),
    );
    expect(plan.nextEntry.svgFile).toBe("state_seal.svg");
  });

  it("wraps inner markup into a normalized SVG document", () => {
    expect(buildSvgDocument("0 0 24 24", '<path d="M0 0"/>')).toBe([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
      '<path d="M0 0"/>',
      "</svg>",
      "",
    ].join("\n"));
  });
});