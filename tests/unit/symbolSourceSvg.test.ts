import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_SVG_DIR = path.resolve("src/config/symbols/svg");
const NATIONAL_SYMBOLS_METADATA = path.resolve("src/config/symbols/metadata/national-symbols.json");
const FORBIDDEN_MARKUP = [
  /<metadata\b/i,
  /<title\b/i,
  /<desc\b/i,
  /inkscape:/i,
  /sodipodi:/i,
  /<!--/,
];

describe("source symbol SVG hygiene", () => {
  it("strips editor metadata from built-in source SVGs", async () => {
    const files = (await readdir(SOURCE_SVG_DIR)).filter((file) => file.endsWith(".svg"));
    const offenders: string[] = [];

    for (const file of files) {
      const raw = await readFile(path.join(SOURCE_SVG_DIR, file), "utf8");
      for (const pattern of FORBIDDEN_MARKUP) {
        if (pattern.test(raw)) {
          offenders.push(`${file} matches ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps wales_flag mapped to the dragon-only source artwork", async () => {
    const entries = JSON.parse(await readFile(NATIONAL_SYMBOLS_METADATA, "utf8")) as Array<{
      id: string;
      svgFile?: string;
    }>;

    const wales = entries.find((entry) => entry.id === "wales_flag");
    expect(wales).toBeDefined();
    expect(wales?.svgFile).toBe("welsh_dragon.svg");
  });

  it("tracks the added state-level source-backed flag assets", async () => {
    const entries = JSON.parse(await readFile(NATIONAL_SYMBOLS_METADATA, "utf8")) as Array<{
      id: string;
      svgFile?: string;
    }>;

    expect(entries.find((entry) => entry.id === "guernsey_flag")?.svgFile).toBe("guernsey_flag.svg");
    expect(entries.find((entry) => entry.id === "sardinia_flag")?.svgFile).toBe("sardinia_flag.svg");
    expect(entries.find((entry) => entry.id === "corsica_flag")?.svgFile).toBe("corsica_flag.svg");
    expect(entries.find((entry) => entry.id === "venice_flag")?.svgFile).toBe("venice_flag.svg");
  });

  it("keeps the Ulster Banner source as a full flag with the red cross", async () => {
    const raw = await readFile(path.join(SOURCE_SVG_DIR, "ulster_banner_flag.svg"), "utf8");

    expect(raw).toContain('viewBox="0 0 600 300"');
    expect(raw).toContain('use href="#a"');
    expect(raw).toContain('transform="matrix(0 .5 -1 0 450 0)"');
    expect(raw).toContain('M296.663 22.53h6.252');
  });

  it("keeps Bavaria as a lozengy flag source instead of diagonal bands", async () => {
    const raw = await readFile(path.join(SOURCE_SVG_DIR, "bavaria_lozengy_flag.svg"), "utf8");

    expect(raw).toContain('viewBox="0 0 1000 600"');
    expect(raw).toContain('fill="#0098d4"');
    expect(raw).toContain('M963.5625');
  });
});