/* ──────────────────────────────────────────────
   Flag Maker – Symbol Loader
   ────────────────────────────────────────────── */

import type { SymbolDef } from "./types";
import { BUILTIN_SYMBOLS } from "./symbols";

export async function loadSymbolsJson(base: string): Promise<{
  symbols: SymbolDef[];
  status: string;
}> {
  try {
    const res = await fetch(`${base}symbols.json`, { cache: "no-store" });
    if (!res.ok) return { symbols: [], status: "No /symbols.json found (using built‑ins)." };
    const data = await res.json();
    const cleaned: SymbolDef[] = data
      .filter(
        (s: Record<string, unknown>) =>
          s &&
          typeof s.id === "string" &&
          (typeof s.path === "string" || typeof s.svg === "string" || s.generator === "star5"),
      )
      .map((s: Record<string, unknown>) => ({
        id: String(s.id),
        name: String(s.name || s.id),
        category: String(s.category || "Imported"),
        path: typeof s.path === "string" ? s.path : undefined,
        svg: typeof s.svg === "string" ? s.svg : undefined,
        viewBox: typeof s.viewBox === "string" ? s.viewBox : undefined,
        generator: s.generator === "star5" ? ("star5" as const) : undefined,
      }));
    return { symbols: cleaned, status: `Loaded ${cleaned.length} symbols from symbols.json` };
  } catch (e) {
    console.error(e);
    return { symbols: [], status: "Failed to load symbols.json" };
  }
}

export function getAllSymbols(remoteSymbols: SymbolDef[]): SymbolDef[] {
  return [...BUILTIN_SYMBOLS, ...remoteSymbols];
}
