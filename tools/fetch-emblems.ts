#!/usr/bin/env npx tsx
/**
 * Fetch official SVG emblems from Wikimedia Commons for the countries and territories
 * listed in src/config/un-countries.json.
 *
 * Downloads raw SVG files, caches them locally, extracts inner SVG markup,
 * and merges results into public/symbols.json.
 *
 * Usage:
 *   npx tsx tools/fetch-emblems.ts
 *   npm run fetch-emblems
 *
 * Requirements:
 *   - Node 20+ (uses global fetch)
 *   - Edit CONTACT below with your site/email (Wikimedia policy)
 */

import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { pruneRuntimeSymbols } from "../src/templateSymbolIds";

const require = createRequire(import.meta.url);
const UN_COUNTRIES: string[] = require("../src/config/un-countries.json");

// ================== YOU MUST EDIT THIS ==================
// Use a descriptive UA with a way to contact you (policy requirement):
const CONTACT = "https://satyrlord.github.io/flag-maker/ ; https://github.com/mohadian/flag-maker";
const USER_AGENT = `FlagMakerCollector/1.0 (${CONTACT}) node-fetch`;
// ========================================================

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const COAT_OF_ARMS_CATEGORY = "Coat of Arms";

const OUT_JSON = path.join("public", "symbols.json");
const CACHE_DIR = path.join("public", "emblems");

interface FileInfo {
  title: string;
  pageurl: string;
  url: string;
}

interface SvgExtract {
  viewBox: string;
  inner: string;
}

interface SymbolEntry {
  id: string;
  name: string;
  category: string;
  viewBox: string;
  svg: string;
  source: string;
  license: string;
  [key: string]: unknown;
}

function isCoatOfArmsEntry(entry: SymbolEntry): boolean {
  return entry.category === COAT_OF_ARMS_CATEGORY;
}

// Politeness: staggered delay between requests to avoid 429s
async function nap(minS = 1.5, maxS = 3.0): Promise<void> {
  const ms = (minS + Math.random() * (maxS - minS)) * 1000;
  await setTimeout(ms);
}

const headers: HeadersInit = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json",
};

/**
 * Call Commons API with retries and JSON-safe parsing.
 */
async function getJson(
  params: Record<string, string>,
  maxRetries = 5,
): Promise<Record<string, unknown> | null> {
  const url = new URL(COMMONS_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(30_000),
      });

      if ([429, 500, 502, 503, 504].includes(resp.status)) {
        const wait = 1.0 * attempt;
        console.log(`  ! HTTP ${resp.status}, retrying in ${wait.toFixed(1)}s ...`);
        await setTimeout(wait * 1000);
        continue;
      }

      const ctype = resp.headers.get("Content-Type") ?? "";
      if (!ctype.includes("application/json")) {
        const text = await resp.text();
        const snippet = text.slice(0, 200).trim().replace(/\n/g, " ");
        console.log(`  ! Non-JSON response (ctype=${ctype}). Snippet: ${JSON.stringify(snippet)}`);
        await setTimeout(1000 * attempt);
        continue;
      }

      return (await resp.json()) as Record<string, unknown>;
    } catch (e) {
      const wait = 1.0 * attempt;
      console.log(`  ! Request error: ${e} -- retrying in ${wait.toFixed(1)}s ...`);
      await setTimeout(wait * 1000);
    }
  }
  return null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9_.\-]/g, "_");
}

/**
 * Get pageurl + original SVG url by exact File:Title.
 * Returns { title, pageurl, url } or null.
 */
async function commonsFileInfoByTitle(
  title: string,
): Promise<FileInfo | null> {
  const params: Record<string, string> = {
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo|info",
    titles: `File:${title}`,
    inprop: "url",
    iiprop: "url|mediatype|mime",
    origin: "*",
  };
  const data = await getJson(params);
  if (!data) return null;

  const query = data.query as Record<string, unknown> | undefined;
  const pages = (query?.pages as Record<string, unknown>[]) ?? [];
  if (!pages.length) return null;

  const page = pages[0];
  if (page.missing) return null;

  const pageurl =
    (page.fullurl as string) ?? (page.canonicalurl as string) ?? "";
  const imageinfo = (page.imageinfo as Record<string, unknown>[]) ?? [];
  if (!imageinfo.length) return null;

  const ii = imageinfo[0];
  const fileUrl = (ii.url as string) ?? "";
  const mime = (ii.mime as string) ?? "";
  if (!fileUrl.toLowerCase().endsWith(".svg") && !mime.includes("svg")) {
    return null;
  }

  return {
    title: (page.title as string) ?? title,
    pageurl,
    url: fileUrl,
  };
}

/**
 * Try common exact titles; if not found, search.
 * Returns { title, pageurl, url } or null.
 */
async function commonsSearchSvg(country: string): Promise<FileInfo | null> {
  const patterns = [
    `Coat of arms of ${country}.svg`,
    `Emblem of ${country}.svg`,
    `State emblem of ${country}.svg`,
    `National emblem of ${country}.svg`,
  ];

  // 1) exact tries
  for (const t of patterns) {
    const res = await commonsFileInfoByTitle(t);
    if (res) return res;
    await nap();
  }

  // 2) search API in File namespace (6) for .svg
  const queryVariants = [
    `intitle:"Coat of arms of ${country}" filetype:svg`,
    `intitle:"Emblem of ${country}" filetype:svg`,
    `intitle:"${country}" coat arms filetype:svg`,
    `intitle:"${country}" emblem filetype:svg`,
  ];

  for (const q of queryVariants) {
    const params: Record<string, string> = {
      action: "query",
      format: "json",
      formatversion: "2",
      list: "search",
      srsearch: q,
      srnamespace: "6", // File:
      srlimit: "10",
      origin: "*",
    };
    const data = await getJson(params);
    if (!data) {
      await nap();
      continue;
    }

    const queryResult = data.query as Record<string, unknown> | undefined;
    const hits =
      (queryResult?.search as Record<string, unknown>[]) ?? [];

    for (const h of hits) {
      const hitTitle = (h.title as string) ?? "";
      if (
        !hitTitle.startsWith("File:") ||
        !hitTitle.toLowerCase().endsWith(".svg")
      ) {
        continue;
      }
      // Resolve to get original file URL
      const info = await commonsFileInfoByTitle(
        hitTitle.replace("File:", ""),
      );
      if (info) return info;
    }
    await nap();
  }

  return null;
}

/**
 * Download SVG with UA + basic retries. Returns true on success.
 */
async function downloadSvg(url: string, dest: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(60_000),
      });

      if (resp.status === 200) {
        const buf = Buffer.from(await resp.arrayBuffer());
        await fs.writeFile(dest, buf);
        return true;
      }

      if ([429, 500, 502, 503, 504].includes(resp.status)) {
        const wait = 1.0 * attempt;
        console.log(
          `  ! HTTP ${resp.status} on file, retrying in ${wait.toFixed(1)}s ...`,
        );
        await setTimeout(wait * 1000);
        continue;
      }

      if (resp.status === 403) {
        console.log(
          "  x 403 Forbidden on file: Wikimedia requires a proper User-Agent.",
        );
        console.log(
          "    Edit CONTACT in this script to include your site/email, then try again.",
        );
        return false;
      }

      console.log(`  x HTTP ${resp.status} on file`);
      return false;
    } catch (e) {
      const wait = 1.0 * attempt;
      console.log(
        `  ! Download error: ${e} -- retrying in ${wait.toFixed(1)}s ...`,
      );
      await setTimeout(wait * 1000);
    }
  }
  return false;
}

/**
 * Extract viewBox and inner SVG markup from a cached SVG file.
 * Returns { viewBox, inner } or null.
 */
async function extractInnerSvg(
  svgPath: string,
): Promise<SvgExtract | null> {
  try {
    const raw = await fs.readFile(svgPath, "utf8");

    // Find the outermost <svg ...> tag
    const startTagMatch = raw.match(/<svg\b[^>]*>/i);
    if (!startTagMatch) return null;

    const endIdx = raw.lastIndexOf("</svg>");
    if (endIdx === -1) return null;

    const startTag = startTagMatch[0];
    const innerStart = startTagMatch.index! + startTag.length;
    const inner = raw.slice(innerStart, endIdx).trim();
    if (!inner) return null;

    // Extract viewBox
    let viewBox: string | null = null;
    const vbMatch = startTag.match(/\bviewBox\s*=\s*"([^"]+)"/i);
    if (vbMatch) {
      viewBox = vbMatch[1];
    } else {
      // Synthesize from width/height
      const wMatch = startTag.match(/\bwidth\s*=\s*"([^"]+)"/i);
      const hMatch = startTag.match(/\bheight\s*=\s*"([^"]+)"/i);
      if (wMatch && hMatch) {
        const w = wMatch[1].replace(/[^0-9.\-]/g, "");
        const h = hMatch[1].replace(/[^0-9.\-]/g, "");
        if (w && h) viewBox = `0 0 ${w} ${h}`;
      }
    }
    if (!viewBox) return null;

    return { viewBox, inner };
  } catch (e) {
    console.log(`  x extract error: ${svgPath}`, e);
    return null;
  }
}

async function main(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const results: SymbolEntry[] = [];
  let ok = 0;
  let failed = 0;

  // Load existing symbols.json (to merge)
  let existing: SymbolEntry[] = [];
  try {
    const raw = await fs.readFile(OUT_JSON, "utf8");
    existing = JSON.parse(raw) as SymbolEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(
        `Failed to load existing symbol catalog at ${OUT_JSON}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    existing = [];
  }

  const existingById = new Map<string, SymbolEntry>();
  for (const s of existing) {
    if (s && typeof s === "object" && s.id) {
      existingById.set(s.id, s);
    }
  }

  for (let i = 0; i < UN_COUNTRIES.length; i++) {
    const country = UN_COUNTRIES[i];
    console.log(`[${i + 1}/${UN_COUNTRIES.length}] ${country} ...`);

    const hit = await commonsSearchSvg(country);
    if (!hit) {
      console.log("  x not found via API/search");
      failed++;
      continue;
    }

    const { title, pageurl, url } = hit;

    const safe = sanitizeFilename(title);
    const dest = path.join(CACHE_DIR, safe);

    let cached = false;
    try {
      const stat = await fs.stat(dest);
      cached = stat.size > 0;
    } catch {
      cached = false;
    }

    if (cached) {
      console.log("  - cached");
    } else {
      if (!(await downloadSvg(url, dest))) {
        console.log("  x download failed");
        failed++;
        continue;
      }
      await nap();
    }

    const parsed = await extractInnerSvg(dest);
    if (!parsed) {
      console.log("  x parse/viewBox/inner failed");
      failed++;
      continue;
    }

    const safeCountry = country
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/'/g, "")
      .replace(/-/g, "_");
    const symId = `${safeCountry}_emblem`;

    results.push({
      id: symId,
      name: `${country} -- National emblem`,
      category: COAT_OF_ARMS_CATEGORY,
      viewBox: parsed.viewBox,
      svg: parsed.inner,
      source:
        pageurl || `https://commons.wikimedia.org/wiki/${safe}`,
      license: "Check file page on Wikimedia Commons",
    });
    ok++;
  }

  // Merge only into the Coat of Arms slice of symbols.json.
  // Non-Coat-of-Arms categories are preserved verbatim and never rewritten by this script.
  for (const r of results) {
    const existingEntry = existingById.get(r.id);
    if (existingEntry && !isCoatOfArmsEntry(existingEntry)) {
      console.warn(
        `  ! skipped ${r.id}: existing symbol belongs to "${existingEntry.category}", not ${COAT_OF_ARMS_CATEGORY}`,
      );
      continue;
    }
    existingById.set(r.id, r);
  }

  const merged = pruneRuntimeSymbols([...existingById.values()]);
  const filteredCount = existingById.size - merged.length;

  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(merged, null, 2), "utf8");

  console.log(
    `\nDone. Added/updated ${ok}, failed ${failed}, kept ${merged.length - ok} existing.`,
  );
  console.log(`-> Wrote ${OUT_JSON}`);
  if (filteredCount > 0) {
    console.log(`-> Filtered out ${filteredCount} runtime symbols not enabled by templates`);
  }
  console.log(
    "If any countries failed, re-run later; caching avoids redownloading.",
  );
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
