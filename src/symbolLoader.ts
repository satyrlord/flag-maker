/* ──────────────────────────────────────────────
   Flag Maker – Symbol Loader
   ────────────────────────────────────────────── */

import type { SymbolDef } from "./types";
import { BUILTIN_SYMBOLS } from "./symbols";

const XML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const SCRIPT_ELEMENT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const EVENT_HANDLER_ATTR_PATTERN = /\s+on[a-z][a-z0-9]*\s*=\s*(?:"[^"]*"|'[^']*')/gi;
const JAVASCRIPT_HREF_PATTERN = /\s*\b(href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi;
const METADATA_BLOCK_PATTERN = /<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi;
const EMPTY_DEFS_BLOCK_PATTERN = /<defs\b[^>]*>(?:\s|&nbsp;|<!--[\s\S]*?-->)*<\/defs>/gi;
const EMPTY_DEFS_SELF_CLOSING_PATTERN = /<defs\b[^>]*\/>/gi;
const OPEN_DEFS_TAG_PATTERN = /<defs\b[^>]*>/i;
const CLOSE_DEFS_TAG_PATTERN = /<\/defs>/i;
const PAINT_ATTRIBUTE_PATTERN = /(\s(?:fill|stroke)\s*=\s*)(["'])(.*?)\2/gi;
const STYLE_ATTRIBUTE_PATTERN = /(\sstyle\s*=\s*)(["'])(.*?)\2/gi;
const INTER_TAG_WHITESPACE_PATTERN = />\s+</g;
const TINTABLE_STYLE_PROPERTIES = new Set(["fill", "stroke"]);
const IMPORTANT_SUFFIX_PATTERN = /\s*!important\s*$/i;
const SVG_ID_ATTRIBUTE_PATTERN = /<([a-z][\w:-]*)\b([^>]*?)\sid=(['"])([^'"]+)\3[^>]*>/gi;
const SVG_REFERENCE_ID_PATTERN = /\b(?:href|xlink:href)=(['"])#([^'"]+)\1/gi;

function normalizeOrphanDefsBlock(svg: string): string {
  if (OPEN_DEFS_TAG_PATTERN.test(svg) || !CLOSE_DEFS_TAG_PATTERN.test(svg)) {
    return svg;
  }

  const referencedIds = new Set<string>();
  for (const match of svg.matchAll(SVG_REFERENCE_ID_PATTERN)) {
    referencedIds.add(match[2]);
  }

  if (referencedIds.size === 0) {
    return svg;
  }

  let insertAt = -1;
  for (const match of svg.matchAll(SVG_ID_ATTRIBUTE_PATTERN)) {
    const id = match[4];
    if (!referencedIds.has(id)) continue;
    insertAt = match.index ?? -1;
    break;
  }

  if (insertAt === -1) {
    return svg;
  }

  const closeDefsMatch = CLOSE_DEFS_TAG_PATTERN.exec(svg);
  if (!closeDefsMatch || closeDefsMatch.index <= insertAt) {
    return svg;
  }

  const defsEnd = closeDefsMatch.index + closeDefsMatch[0].length;
  const defsContent = svg.slice(insertAt, closeDefsMatch.index);
  const leadingContent = svg.slice(0, insertAt);
  const trailingContent = svg.slice(defsEnd);

  return `<defs>${defsContent}</defs>${leadingContent}${trailingContent}`;
}

function trimImportantSuffix(value: string): string {
  const importantMatch = value.match(IMPORTANT_SUFFIX_PATTERN);
  return importantMatch ? value.slice(0, importantMatch.index).trim() : value.trim();
}

function expandShortHexColor(value: string): string {
  if (!/^#[\da-f]{3,4}$/i.test(value)) return value.toLowerCase();
  const [, ...digits] = value.toLowerCase();
  return `#${digits.map((digit) => `${digit}${digit}`).join("")}`;
}

function canonicalizeTintablePaintValue(value: string): string {
  const baseValue = trimImportantSuffix(value);
  if (!isTintablePaintValue(baseValue)) return baseValue.toLowerCase();

  const compactValue = baseValue.replace(/\s+/g, " ").trim().toLowerCase();
  if (/^#[\da-f]{3,4}$/i.test(compactValue)) {
    return expandShortHexColor(compactValue);
  }
  if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(compactValue)) {
    return compactValue;
  }
  if (/^(?:rgb|rgba|hsl|hsla)\(/i.test(compactValue)) {
    return compactValue.replace(/\s+/g, "");
  }

  if (typeof document !== "undefined") {
    const sample = document.createElement("span");
    sample.style.color = "";
    sample.style.color = compactValue;
    if (sample.style.color) {
      return sample.style.color.replace(/\s+/g, "").toLowerCase();
    }
  }

  return compactValue;
}

function collectTintablePaintValues(svg: string): Set<string> {
  const tintablePaints = new Set<string>();

  for (const match of svg.matchAll(PAINT_ATTRIBUTE_PATTERN)) {
    const value = match[3];
    if (!value || !isTintablePaintValue(trimImportantSuffix(value))) continue;
    tintablePaints.add(canonicalizeTintablePaintValue(value));
  }

  for (const match of svg.matchAll(STYLE_ATTRIBUTE_PATTERN)) {
    const declarations = match[3]?.split(";") ?? [];
    for (const declaration of declarations) {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) continue;
      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      if (!TINTABLE_STYLE_PROPERTIES.has(property)) continue;
      const value = declaration.slice(separatorIndex + 1).trim();
      if (!value || !isTintablePaintValue(trimImportantSuffix(value))) continue;
      tintablePaints.add(canonicalizeTintablePaintValue(value));
    }
  }

  return tintablePaints;
}

function shouldNormalizeImportedSvgColors(svg: string): boolean {
  return collectTintablePaintValues(svg).size === 1;
}

function isTintablePaintValue(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/^url\(/i.test(normalized)) return false;
  // Preserve explicitly transparent paint so imported emblems can keep intentional cutouts.
  if (/^(?:none|currentColor|context-fill|context-stroke|inherit|transparent|var\()/i.test(normalized)) {
    return false;
  }
  return true;
}

function normalizePaintValue(value: string): string {
  const importantMatch = value.match(IMPORTANT_SUFFIX_PATTERN);
  const suffix = importantMatch ? " !important" : "";
  const baseValue = trimImportantSuffix(value);
  if (!isTintablePaintValue(baseValue)) {
    return value.trim();
  }
  return `currentColor${suffix}`;
}

function normalizeInlineStyle(styleValue: string): string {
  return styleValue
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) return declaration;
      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (!TINTABLE_STYLE_PROPERTIES.has(property.toLowerCase())) {
        return `${property}: ${value}`;
      }
      return `${property}: ${normalizePaintValue(value)}`;
    })
    .join("; ");
}

export function sanitizeImportedSvgMarkup(svg: string): string {
  const cleanedSvg = normalizeOrphanDefsBlock(svg)
    .replace(XML_COMMENT_PATTERN, "")
    .replace(SCRIPT_ELEMENT_PATTERN, "")
    .replace(EVENT_HANDLER_ATTR_PATTERN, "")
    .replace(JAVASCRIPT_HREF_PATTERN, "")
    .replace(METADATA_BLOCK_PATTERN, "")
    .replace(EMPTY_DEFS_BLOCK_PATTERN, "")
    .replace(EMPTY_DEFS_SELF_CLOSING_PATTERN, "");

  const normalizedSvg = shouldNormalizeImportedSvgColors(cleanedSvg)
    ? cleanedSvg
      .replace(PAINT_ATTRIBUTE_PATTERN, (match, prefix: string, quote: string, value: string) => {
      const normalizedValue = normalizePaintValue(value);
      return normalizedValue === value.trim() ? match : `${prefix}${quote}${normalizedValue}${quote}`;
    })
      .replace(STYLE_ATTRIBUTE_PATTERN, (match, prefix: string, quote: string, value: string) => {
        const normalizedStyle = normalizeInlineStyle(value);
        return normalizedStyle === value.trim() ? match : `${prefix}${quote}${normalizedStyle}${quote}`;
      })
    : cleanedSvg;

  return normalizedSvg
    .replace(INTER_TAG_WHITESPACE_PATTERN, "> <")
    .trim();
}

export function normalizeImportedSymbol(symbol: SymbolDef): SymbolDef {
  return {
    ...symbol,
    svg: typeof symbol.svg === "string"
      ? sanitizeImportedSvgMarkup(symbol.svg)
      : undefined,
  };
}

function dedupeSymbolsById(symbols: SymbolDef[]): SymbolDef[] {
  const uniqueById = new Map<string, SymbolDef>();
  for (const symbol of symbols) {
    uniqueById.set(symbol.id, symbol);
  }
  return [...uniqueById.values()];
}

export async function loadSymbolsJson(base: string): Promise<{
  symbols: SymbolDef[];
  status: string;
}> {
  try {
    const res = await fetch(`${base}symbols.json`, { cache: "no-store" });
    if (!res.ok) return { symbols: [], status: "No /symbols.json found (using built‑ins)." };
    const data = await res.json();
    const cleaned: SymbolDef[] = (Array.isArray(data) ? data : [])
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
        svg: typeof s.svg === "string" ? sanitizeImportedSvgMarkup(s.svg) : undefined,
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
  return dedupeSymbolsById([...BUILTIN_SYMBOLS, ...remoteSymbols]);
}
