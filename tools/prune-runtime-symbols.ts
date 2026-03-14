#!/usr/bin/env npx tsx

import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { pruneRuntimeSymbols } from "../src/templateSymbolIds";

const DEFAULT_INPUT = path.join("public", "symbols.json");

interface RuntimeSymbolEntry {
  id: string;
  category: string;
  [key: string]: unknown;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      out[key] = true;
      continue;
    }

    out[key] = value;
    index += 1;
  }
  return out;
}

export function pruneRuntimeSymbolCatalog(symbols: readonly RuntimeSymbolEntry[]): RuntimeSymbolEntry[] {
  return pruneRuntimeSymbols(symbols);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const filePath = typeof args.file === "string" ? args.file : DEFAULT_INPUT;
  const dryRun = Boolean(args["dry-run"]);

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as RuntimeSymbolEntry[];
  if (!Array.isArray(parsed)) {
    throw new Error(`Runtime symbol catalog must be an array: ${filePath}`);
  }

  const pruned = pruneRuntimeSymbolCatalog(parsed);
  const filteredCount = parsed.length - pruned.length;

  if (dryRun) {
    console.log(`-> Dry run: would rewrite ${filePath}`);
  } else {
    await fs.writeFile(filePath, `${JSON.stringify(pruned, null, 2)}\n`, "utf8");
    console.log(`-> Rewrote ${filePath}`);
  }

  console.log(`Retained ${pruned.length} symbols; filtered out ${filteredCount}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}