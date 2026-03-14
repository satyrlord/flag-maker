#!/usr/bin/env npx tsx
/**
 * Fetch curated flag symbols from Wikimedia Commons.
 *
 * Unlike fetch-emblems.ts (which bulk-downloads national coats of arms),
 * this script fetches specific individual symbols commonly found on flags
 * (suns, wheels, eagles, crescents, etc.) using a curated manifest.
 *
 * Output: updates src/config/symbols/metadata/*.json and src/config/symbols/svg/*.svg,
 *         then regenerates src/config/symbols-catalog.generated.json.
 *         Use --out to write a flat JSON snapshot instead.
 *
 * Usage:
 *   npx tsx tools/fetch-symbols.ts
 *   npx tsx tools/fetch-symbols.ts --out public/symbols.json
 *   npx tsx tools/fetch-symbols.ts --dry-run
 *   npm run fetch-symbols
 */

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { pruneRuntimeSymbols } from "../src/templateSymbolIds";

// ================== YOU MUST EDIT THIS ==================
// Use a descriptive UA with a way to contact you (policy requirement):
const CONTACT = "https://github.com/SatyrLord/flag-maker ; flag-maker tool";
const USER_AGENT = `FlagMakerCollector/1.0 (${CONTACT}) node-fetch`;
// ========================================================

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CACHE_DIR = path.join("public", "emblems");
const SYMBOL_SOURCE_CONFIG = path.join("src", "config", "symbols-config.json");
const PRESERVE_EXISTING_SYMBOL_IDS = new Set(["tryzub", "cedar_lebanon"]);
const execFileAsync = promisify(execFile);

// --------------- Manifest of flag symbols to fetch ---------------
// Each entry specifies an id, display name, category, and one or more
// exact Wikimedia Commons file titles to try (in order of preference).
// The first title that resolves to a valid SVG wins.

interface SymbolManifest {
  id: string;
  name: string;
  category: string;
  titles: string[];
}

const SYMBOL_MANIFEST: SymbolManifest[] = [
  // -- Celestial --
  {
    id: "sol_de_mayo",
    name: "Sol de Mayo",
    category: "Celestial",
    titles: [
      "Sol de Mayo-Bandera de Argentina.svg",
      "Sol de Mayo.svg",
    ],
  },
  {
    id: "sun_philippines",
    name: "Sun (Philippines)",
    category: "Celestial",
    titles: [
      "Flag of the Philippines - cropped sun.svg",
      "Sun symbol of the Philippines.svg",
    ],
  },

  {
    id: "star_morocco",
    name: "Pentacle (Morocco)",
    category: "Celestial",
    titles: [
      "Star of Morocco (unbordered).svg",
      "Pentacle of Morocco.svg",
    ],
  },
  {
    id: "star_ethiopia",
    name: "Star (Ethiopia)",
    category: "Celestial",
    titles: [
      "Emblem of Ethiopia.svg",
      "Emblem on the flag of Ethiopia.svg",
    ],
  },

  // -- Cultural / National --
  {
    id: "ashoka_chakra",
    name: "Ashoka Chakra",
    category: "Cultural",
    titles: [
      "Ashoka Chakra.svg",
      "Ashoka chakra.svg",
    ],
  },
  {
    id: "taeguk",
    name: "Taeguk (Yin-Yang)",
    category: "Cultural",
    titles: [
      "Taegeuk.svg",
      "Korean Taeguk.svg",
    ],
  },
  {
    id: "khanda",
    name: "Khanda",
    category: "Religious",
    titles: [
      "Khanda1.svg",
      "Khanda.svg",
    ],
  },
  {
    id: "tryzub",
    name: "Tryzub (Ukraine)",
    category: "Cultural",
    titles: [
      "Lesser Coat of Arms of Ukraine.svg",
      "Tryzub.svg",
      "Coat of arms of Ukraine (monochrome).svg",
    ],
  },

  // -- Heraldic --
  {
    id: "fleur_de_lis",
    name: "Fleur-de-lis",
    category: "Heraldic",
    titles: [
      "Fleur-de-lis-fill.svg",
      "Fleur de lis.svg",
      "FleurDeLis.svg",
    ],
  },
  {
    id: "lion_rampant",
    name: "Lion Rampant",
    category: "Heraldic",
    titles: [
      "Heraldic Lion 02.svg",
      "Lion rampant.svg",
      "Lion Rampant.svg",
    ],
  },
  {
    id: "double_headed_eagle",
    name: "Double-Headed Eagle",
    category: "Heraldic",
    titles: [
      "Double-headed eagle of the Byzantine Empire.svg",
      "Albanian eagle.svg",
      "Double-headed eagle.svg",
    ],
  },
  {
    id: "castle_heraldic",
    name: "Castle (Heraldic)",
    category: "Heraldic",
    titles: [
      "Simple heraldic castle.svg",
      "Heraldic Castle.svg",
    ],
  },

  // -- Political --
  {
    id: "hammer_sickle",
    name: "Hammer and Sickle",
    category: "Political",
    titles: [
      "Hammer and sickle red on transparent.svg",
      "Hammer and Sickle.svg",
    ],
  },
  {
    id: "fasces",
    name: "Fasces",
    category: "Political",
    titles: [
      "Fascist symbol.svg",
      "Fasces.svg",
    ],
  },

  // -- Religious --
  {
    id: "dharma_wheel",
    name: "Dharma Wheel",
    category: "Religious",
    titles: [
      "Dharmachakra.svg",
      "Dharma Wheel.svg",
    ],
  },
  {
    id: "menorah",
    name: "Menorah",
    category: "Religious",
    titles: [
      "Menorah.svg",
      "Emblem of Israel.svg",
    ],
  },
  {
    id: "latin_cross",
    name: "Latin Cross",
    category: "Religious",
    titles: [
      "Christian cross.svg",
      "Latin cross.svg",
    ],
  },
  {
    id: "orthodox_cross",
    name: "Orthodox Cross",
    category: "Religious",
    titles: [
      "Orthodox cross.svg",
      "Russian Orthodox cross.svg",
    ],
  },
  {
    id: "jerusalem_cross",
    name: "Jerusalem Cross",
    category: "Religious",
    titles: [
      "Jerusalem Cross.svg",
      "Cross of Jerusalem.svg",
    ],
  },
  {
    id: "maltese_cross",
    name: "Maltese Cross",
    category: "Religious",
    titles: [
      "Maltese cross.svg",
      "Cross pattée.svg",
    ],
  },
  {
    id: "coptic_cross",
    name: "Coptic Cross",
    category: "Religious",
    titles: [
      "Coptic cross.svg",
      "Coptic Cross.svg",
    ],
  },
  {
    id: "star_of_david",
    name: "Star of David",
    category: "Religious",
    titles: [
      "Star of David.svg",
      "Magen David.svg",
    ],
  },
  {
    id: "rub_el_hizb",
    name: "Rub el Hizb",
    category: "Religious",
    titles: [
      "Rub el Hizb.svg",
      "Rub El Hizb.svg",
    ],
  },
  {
    id: "bahai_nine_pointed_star",
    name: "Baha'i Nine-Pointed Star",
    category: "Religious",
    titles: [
      "Bahai star.svg",
      "Nine-point star (white).svg",
    ],
  },
  {
    id: "crescent_islamic",
    name: "Islamic Crescent",
    category: "Religious",
    titles: [
      "Islamic crescent.svg",
      "Crescent.svg",
    ],
  },
  {
    id: "star_and_crescent",
    name: "Star and Crescent",
    category: "Religious",
    titles: [
      "Star and Crescent.svg",
      "Ottoman star and crescent.svg",
    ],
  },
  {
    id: "double_crescent",
    name: "Double Crescent",
    category: "Religious",
    titles: [
      "Double crescent symbol.svg",
      "Double crescent symbol (filled, color).svg",
    ],
  },

  // -- Geometric / Patterns --
  {
    id: "trigram_geon",
    name: "Trigram Geon (Heaven)",
    category: "Geometric",
    titles: [
      "Palgwae Geon.svg",
    ],
  },
  {
    id: "trigram_gon",
    name: "Trigram Gon (Earth)",
    category: "Geometric",
    titles: [
      "Palgwae Gon.svg",
    ],
  },
  {
    id: "trigram_ri",
    name: "Trigram Ri (Fire)",
    category: "Geometric",
    titles: [
      "Palgwae Ri.svg",
    ],
  },
  {
    id: "trigram_gam",
    name: "Trigram Gam (Water)",
    category: "Geometric",
    titles: [
      "Palgwae Gam.svg",
    ],
  },
  {
    id: "shield_heraldic",
    name: "Shield (Heraldic)",
    category: "Heraldic",
    titles: [
      "Heraldic shield.svg",
      "Escutcheon.svg",
    ],
  },

  // -- Plants --
  {
    id: "olive_branch",
    name: "Olive Branch",
    category: "Plants",
    titles: [
      "Olive branch.svg",
      "Olive Branch.svg",
    ],
  },
  {
    id: "laurel_wreath",
    name: "Laurel Wreath",
    category: "Plants",
    titles: [
      "Laurel wreath.svg",
      "Laurel Wreath.svg",
    ],
  },
  {
    id: "lotus",
    name: "Lotus",
    category: "Plants",
    titles: [
      "Lotus flower symbol.svg",
      "Lotus.svg",
      "Nelumbo nucifera-heraldic.svg",
    ],
  },
  {
    id: "maple_leaf",
    name: "Maple Leaf (Canada)",
    category: "Plants",
    titles: [
      "Flag of Canada (leaf).svg",
      "Maple leaf -- heraldic.svg",
      "Red maple leaf.svg",
    ],
  },
  {
    id: "cedar_lebanon",
    name: "Cedar (Lebanon)",
    category: "Plants",
    titles: [
      "Flag of Lebanon - Cedar Tree.svg",
      "Cedar of Lebanon.svg",
    ],
  },

  // -- Animals --
  {
    id: "eagle_heraldic",
    name: "Eagle (Heraldic)",
    category: "Animals",
    titles: [
      "Heraldic Eagle.svg",
      "Eagle heraldic.svg",
    ],
  },
  {
    id: "dragon_heraldic",
    name: "Dragon (Heraldic)",
    category: "Animals",
    titles: [
      "Y Ddraig Goch.svg",
      "Welsh dragon.svg",
      "Flag of Wales dragon only.svg",
    ],
  },
  {
    id: "condor",
    name: "Condor",
    category: "Animals",
    titles: [
      "Ecuadorian condor.svg",
      "Heraldic condor.svg",
    ],
  },


  // -- Weapons / Tools --
  {
    id: "crossed_swords",
    name: "Crossed Swords",
    category: "Weapons",
    titles: [
      "Crossed swords.svg",
      "Crossed Swords.svg",
    ],
  },
  {
    id: "anchor",
    name: "Anchor",
    category: "Weapons",
    titles: [
      "Anchor erected.svg",
      "Anchor (heraldic).svg",
    ],
  },
];

// --------------- HTTP helpers ---------------

const headers: HeadersInit = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json",
};

async function nap(minS = 0.35, maxS = 0.7): Promise<void> {
  const ms = (minS + Math.random() * (maxS - minS)) * 1000;
  await setTimeout(ms);
}

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

// --------------- Wikimedia API ---------------

interface FileInfo {
  title: string;
  pageurl: string;
  url: string;
}

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
 * Try each title in order; also fall back to a Commons search.
 */
async function resolveSymbol(manifest: SymbolManifest): Promise<FileInfo | null> {
  // 1) Try exact titles
  for (const t of manifest.titles) {
    const res = await commonsFileInfoByTitle(t);
    if (res) return res;
    await nap();
  }

  // 2) Fall back to search API using the symbol name
  const searchTerms = [
    `intitle:"${manifest.name}" filetype:svg`,
    `"${manifest.name}" filetype:svg`,
  ];

  for (const q of searchTerms) {
    const params: Record<string, string> = {
      action: "query",
      format: "json",
      formatversion: "2",
      list: "search",
      srsearch: q,
      srnamespace: "6",
      srlimit: "5",
      origin: "*",
    };
    const data = await getJson(params);
    if (!data) {
      await nap();
      continue;
    }

    const queryResult = data.query as Record<string, unknown> | undefined;
    const hits = (queryResult?.search as Record<string, unknown>[]) ?? [];

    for (const h of hits) {
      const hitTitle = (h.title as string) ?? "";
      if (
        !hitTitle.startsWith("File:") ||
        !hitTitle.toLowerCase().endsWith(".svg")
      ) {
        continue;
      }
      const info = await commonsFileInfoByTitle(hitTitle.replace("File:", ""));
      if (info) return info;
    }
    await nap();
  }

  return null;
}

// --------------- SVG download & extraction ---------------

async function downloadSvg(url: string, dest: string, dryRun = false): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(60_000),
      });

      if (resp.status === 200) {
        const buf = Buffer.from(await resp.arrayBuffer());
        if (!dryRun) {
          await fs.writeFile(dest, buf);
        }
        return buf;
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
        return null;
      }

      console.log(`  x HTTP ${resp.status} on file`);
      return null;
    } catch (e) {
      const wait = 1.0 * attempt;
      console.log(
        `  ! Download error: ${e} -- retrying in ${wait.toFixed(1)}s ...`,
      );
      await setTimeout(wait * 1000);
    }
  }
  return null;
}

export interface SvgExtract {
  viewBox: string;
  inner: string;
}

function normalizeSymbolInner(id: string, inner: string): string {
  if (id !== "jerusalem_cross") {
    return inner;
  }

  return inner.replace(
    /^\s*<rect\b[^>]*\bfill=\"#FFFFFF\"[^>]*\/?>\s*/i,
    "",
  );
}

export function extractInnerSvgFromRaw(raw: string): SvgExtract | null {
  const startTagMatch = raw.match(/<svg\b[^>]*>/i);
  if (!startTagMatch) return null;

  const endIdx = raw.lastIndexOf("</svg>");
  if (endIdx === -1) return null;

  const startTag = startTagMatch[0];
  const innerStart = (startTagMatch.index ?? 0) + startTag.length;
  const inner = raw.slice(innerStart, endIdx).trim();
  if (!inner) return null;

  let viewBox: string | null = null;
  const vbMatch = startTag.match(/\bviewBox\s*=\s*"([^"]+)"/i);
  if (vbMatch) {
    viewBox = vbMatch[1];
  } else {
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
}

async function extractInnerSvg(svgPath: string): Promise<SvgExtract | null> {
  try {
    const raw = await fs.readFile(svgPath, "utf8");
    return extractInnerSvgFromRaw(raw);
  } catch (e) {
    console.log(`  x extract error: ${svgPath}`, e);
    return null;
  }
}

// --------------- CLI args ---------------

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) out[k] = true;
    else { out[k] = v; i++; }
  }
  return out;
}

// --------------- Main ---------------

interface SymbolEntry {
  id: string;
  name: string;
  category: string;
  viewBox?: string;
  svg?: string;
  path?: string;
  generator?: string;
  source?: string;
  license?: string;
  [key: string]: unknown;
}

export interface SymbolCatalogConfig {
  metadataFiles: string[];
  svgDirectory: string;
  outputFile: string;
}

export interface SymbolSourceEntry {
  id: string;
  name: string;
  category: string;
  svgFile?: string;
  path?: string;
  fillRule?: "evenodd" | "nonzero";
  generator?: string;
  source?: string;
  license?: string;
}

interface MetadataFileState {
  absolutePath: string;
  entries: SymbolSourceEntry[];
}

export interface SourceCatalogState {
  config: SymbolCatalogConfig;
  configDir: string;
  metadataFiles: MetadataFileState[];
  fileIndexByCategory: Map<string, number>;
  entryById: Map<string, { fileIndex: number; entryIndex: number; entry: SymbolSourceEntry }>;
}

export function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isRuntimeDefined(entry: SymbolEntry | undefined): boolean {
  return Boolean(entry?.svg || entry?.viewBox || entry?.path || entry?.generator);
}

function isSourceDefined(entry: SymbolSourceEntry | undefined): boolean {
  return Boolean(entry?.svgFile || entry?.path || entry?.generator);
}

export function buildSvgDocument(viewBox: string, inner: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
    inner,
    "</svg>",
    "",
  ].join("\n");
}

async function loadSourceCatalog(): Promise<SourceCatalogState> {
  const configRaw = await fs.readFile(SYMBOL_SOURCE_CONFIG, "utf8");
  const config = JSON.parse(configRaw) as SymbolCatalogConfig;
  const configDir = path.dirname(SYMBOL_SOURCE_CONFIG);
  const metadataFiles: MetadataFileState[] = [];
  const fileIndexByCategory = new Map<string, number>();
  const entryById = new Map<string, { fileIndex: number; entryIndex: number; entry: SymbolSourceEntry }>();

  for (const relativePath of config.metadataFiles) {
    const absolutePath = path.join(configDir, relativePath);
    const raw = await fs.readFile(absolutePath, "utf8");
    const entries = JSON.parse(raw) as SymbolSourceEntry[];
    const fileIndex = metadataFiles.length;
    metadataFiles.push({ absolutePath, entries });
    fileIndexByCategory.set(path.basename(relativePath, ".json"), fileIndex);

    entries.forEach((entry, entryIndex) => {
      entryById.set(entry.id, { fileIndex, entryIndex, entry });
      fileIndexByCategory.set(normalizeCategoryKey(entry.category), fileIndex);
    });
  }

  return { config, configDir, metadataFiles, fileIndexByCategory, entryById };
}

async function writeSourceCatalog(state: SourceCatalogState): Promise<void> {
  for (const metadataFile of state.metadataFiles) {
    await fs.writeFile(
      metadataFile.absolutePath,
      `${JSON.stringify(metadataFile.entries, null, 2)}\n`,
      "utf8",
    );
  }
}

export function getCategoryFileIndex(state: SourceCatalogState, category: string): number {
  const fileIndex = state.fileIndexByCategory.get(normalizeCategoryKey(category));
  if (fileIndex !== undefined) {
    return fileIndex;
  }

  throw new Error(`No metadata file configured for category: ${category}`);
}

export interface SourceSymbolUpsertPlan {
  svgFileName: string;
  svgOutputPath: string;
  metadataOutputPath: string;
  nextEntry: SymbolSourceEntry;
  fileIndex: number;
  entryIndex: number;
  isUpdate: boolean;
}

export function planSourceSymbolUpsert(
  state: SourceCatalogState,
  entry: SymbolSourceEntry,
): SourceSymbolUpsertPlan {
  const svgFileName = `${entry.id}.svg`;
  const nextEntry: SymbolSourceEntry = {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    svgFile: svgFileName,
    source: entry.source,
    license: entry.license,
  };

  const existing = state.entryById.get(entry.id);
  const fileIndex = existing?.fileIndex ?? getCategoryFileIndex(state, entry.category);
  const entryIndex = existing?.entryIndex ?? state.metadataFiles[fileIndex].entries.length;

  return {
    svgFileName,
    svgOutputPath: path.join(state.configDir, state.config.svgDirectory, svgFileName),
    metadataOutputPath: state.metadataFiles[fileIndex].absolutePath,
    nextEntry,
    fileIndex,
    entryIndex,
    isUpdate: Boolean(existing),
  };
}

function commitSourceSymbolUpsertPlan(state: SourceCatalogState, plan: SourceSymbolUpsertPlan): void {
  const targetEntries = state.metadataFiles[plan.fileIndex].entries;
  if (plan.isUpdate) {
    targetEntries[plan.entryIndex] = plan.nextEntry;
  } else {
    targetEntries.push(plan.nextEntry);
  }

  state.entryById.set(plan.nextEntry.id, {
    fileIndex: plan.fileIndex,
    entryIndex: plan.entryIndex,
    entry: plan.nextEntry,
  });
}

async function upsertSourceSymbol(
  state: SourceCatalogState,
  entry: SymbolSourceEntry,
): Promise<SourceSymbolUpsertPlan> {
  const plan = planSourceSymbolUpsert(state, entry);
  commitSourceSymbolUpsertPlan(state, plan);
  return plan;
}

async function snapshotFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function restoreSnapshot(filePath: string, contents: string | null): Promise<void> {
  if (contents === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function publishSourceCatalogChanges(
  state: SourceCatalogState,
  pendingSvgWrites: Map<string, string>,
): Promise<void> {
  const generatedCatalogPath = path.join(path.dirname(SYMBOL_SOURCE_CONFIG), state.config.outputFile);
  const trackedPaths = new Set<string>([
    ...state.metadataFiles.map((metadataFile) => metadataFile.absolutePath),
    ...pendingSvgWrites.keys(),
    generatedCatalogPath,
  ]);
  const snapshots = new Map<string, string | null>();

  for (const filePath of trackedPaths) {
    snapshots.set(filePath, await snapshotFile(filePath));
  }

  try {
    await writeSourceCatalog(state);
    for (const [filePath, contents] of pendingSvgWrites) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, contents, "utf8");
    }
    await rebuildGeneratedCatalog();
  } catch (error) {
    for (const [filePath, contents] of snapshots) {
      await restoreSnapshot(filePath, contents);
    }
    throw error;
  }
}

async function rebuildGeneratedCatalog(): Promise<void> {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const { stdout, stderr } = await execFileAsync(npmCommand, ["run", "build:symbols"], {
    cwd: process.cwd(),
  });
  const output = `${stdout}${stderr}`.trim();
  if (output) {
    console.log(output);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const outFile = typeof args.out === "string" ? args.out : null;
  const dryRun = Boolean(args["dry-run"]);
  const skipExisting = Boolean(args["skip-existing"]);

  await fs.mkdir(CACHE_DIR, { recursive: true });

  const existingById = new Map<string, SymbolEntry>();
  const sourceCatalog = outFile ? null : await loadSourceCatalog();
  const pendingSvgWrites = new Map<string, string>();

  if (outFile) {
    let existing: SymbolEntry[] = [];
    try {
      const raw = await fs.readFile(outFile, "utf8");
      existing = JSON.parse(raw) as SymbolEntry[];
    } catch {
      existing = [];
    }

    for (const s of existing) {
      if (s && typeof s === "object" && s.id) {
        existingById.set(s.id, s);
      }
    }
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < SYMBOL_MANIFEST.length; i++) {
    const manifest = SYMBOL_MANIFEST[i];
    console.log(`[${i + 1}/${SYMBOL_MANIFEST.length}] ${manifest.name} ...`);

    const existingEntry = outFile ? existingById.get(manifest.id) : sourceCatalog?.entryById.get(manifest.id)?.entry;
    if (
      PRESERVE_EXISTING_SYMBOL_IDS.has(manifest.id) &&
      existingEntry &&
      (outFile ? isRuntimeDefined(existingEntry as SymbolEntry) : isSourceDefined(existingEntry as SymbolSourceEntry))
    ) {
      console.log("  - preserved curated symbol");
      skipped++;
      continue;
    }

    // Skip if already exists and flag is set
    if (
      skipExisting &&
      existingEntry &&
      (outFile ? isRuntimeDefined(existingEntry as SymbolEntry) : isSourceDefined(existingEntry as SymbolSourceEntry))
    ) {
      console.log("  - already exists, skipping");
      skipped++;
      continue;
    }

    const hit = await resolveSymbol(manifest);
    if (!hit) {
      console.log("  x not found on Wikimedia Commons");
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
    }

    let svgBuffer: Buffer | null = null;
    if (cached) {
      svgBuffer = await fs.readFile(dest);
    } else {
      svgBuffer = await downloadSvg(url, dest, dryRun);
      if (!svgBuffer) {
        console.log("  x download failed");
        failed++;
        continue;
      }
      if (dryRun) {
        console.log("  - fetched (dry run)");
      }
      await nap();
    }

    const parsed = extractInnerSvgFromRaw(svgBuffer.toString("utf8"));
    if (!parsed) {
      console.log("  x parse/viewBox/inner failed");
      failed++;
      continue;
    }

    const normalizedSvg = normalizeSymbolInner(manifest.id, parsed.inner);
    const source = pageurl || `https://commons.wikimedia.org/wiki/${safe}`;
    const license = "Check file page on Wikimedia Commons";

    const entry: SymbolEntry = {
      id: manifest.id,
      name: manifest.name,
      category: manifest.category,
      viewBox: parsed.viewBox,
      svg: normalizedSvg,
      source,
      license,
    };

    if (outFile) {
      existingById.set(manifest.id, entry);
    } else if (sourceCatalog) {
      const plan = await upsertSourceSymbol(
        sourceCatalog,
        {
          id: manifest.id,
          name: manifest.name,
          category: manifest.category,
          source,
          license,
        },
      );

      if (!dryRun) {
        pendingSvgWrites.set(plan.svgOutputPath, buildSvgDocument(parsed.viewBox, normalizedSvg));
      }

      if (dryRun) {
        const action = plan.isUpdate ? "update" : "add";
        console.log(
          `  - dry run: would ${action} ${path.relative(process.cwd(), plan.metadataOutputPath)} and ${path.relative(process.cwd(), plan.svgOutputPath)}`,
        );
      }
    }

    ok++;
    console.log(`  + ok (viewBox: ${parsed.viewBox})`);
  }

  let totalSymbols = 0;
  if (outFile) {
    const merged = pruneRuntimeSymbols([...existingById.values()]);
    const filteredCount = existingById.size - merged.length;
    totalSymbols = merged.length;
    if (dryRun) {
      console.log(`-> Dry run: would write ${outFile}`);
      if (filteredCount > 0) {
        console.log(`-> Dry run: would filter out ${filteredCount} runtime symbols`);
      }
    } else {
      await fs.mkdir(path.dirname(outFile), { recursive: true });
      await fs.writeFile(outFile, JSON.stringify(merged, null, 2), "utf8");
      console.log(`-> Wrote ${outFile}`);
      if (filteredCount > 0) {
        console.log(`-> Filtered out ${filteredCount} runtime symbols not enabled by templates`);
      }
    }
  } else if (sourceCatalog) {
    totalSymbols = sourceCatalog.entryById.size;
    if (dryRun) {
      console.log(`-> Dry run: would update ${SYMBOL_SOURCE_CONFIG}`);
      console.log(`-> Dry run: would update ${path.join(path.dirname(SYMBOL_SOURCE_CONFIG), sourceCatalog.config.svgDirectory)}`);
      console.log(`-> Dry run: would regenerate ${path.join(path.dirname(SYMBOL_SOURCE_CONFIG), sourceCatalog.config.outputFile)}`);
    } else {
      await publishSourceCatalogChanges(sourceCatalog, pendingSvgWrites);
      console.log(`-> Updated ${SYMBOL_SOURCE_CONFIG}`);
      console.log(`-> Updated ${path.join(path.dirname(SYMBOL_SOURCE_CONFIG), sourceCatalog.config.svgDirectory)}`);
    }
  }

  console.log(
    `\nDone. Added/updated ${ok}, skipped ${skipped}, failed ${failed}.`,
  );
  console.log(`Total symbols: ${totalSymbols}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
