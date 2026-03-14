import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_SVG_DIR = path.resolve("src/config/symbols/svg");
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
});