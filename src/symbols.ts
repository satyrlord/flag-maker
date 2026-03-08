/* ──────────────────────────────────────────────
   Flag Maker – Built-in Symbols
   ────────────────────────────────────────────── */

import type { SymbolDef } from "./types";

export const BUILTIN_SYMBOLS: SymbolDef[] = [
  { id: "star5", name: "Star (5‑point)", category: "Stars", generator: "star5" },
  { id: "star6_hexagram", name: "Star of David (hexagram)", category: "Stars", path: "M50 8 L90 78 L10 78 Z M50 92 L10 22 L90 22 Z" },
  { id: "crescent", name: "Crescent", category: "Religious/Heraldic", path: "M70 50 A30 30 0 1 1 40 50 A18 22 0 1 0 70 50 Z" },
  { id: "star_crescent", name: "Star & Crescent", category: "Religious/Heraldic", path: "M70 50 A30 30 0 1 1 40 50 A18 22 0 1 0 70 50 Z M86 40 L91 50 L102 50 L93 56 L96 66 L86 60 L76 66 L79 56 L70 50 L81 50 Z" },
  { id: "greek_cross", name: "Greek Cross", category: "Crosses", path: "M42 10 H58 V42 H90 V58 H58 V90 H42 V58 H10 V42 H42 Z" },
  { id: "latin_cross", name: "Latin Cross", category: "Crosses", path: "M45 10 H55 V45 H85 V55 H55 V90 H45 V55 H15 V45 H45 Z" },
  { id: "triangle_isosceles", name: "Triangle (isosceles)", category: "Geometric", path: "M10 90 L90 90 L50 10 Z" },
  { id: "sun_12", name: "Sun (12 rays)", category: "Celestial", path: (() => {
      const cx = 50, cy = 50, R = 28, r = 14; const rays = 12; let p = ""; const step = Math.PI / rays;
      for (let i = 0; i < 2 * rays; i++) { const rr = i % 2 === 0 ? R : r; const a = -Math.PI / 2 + i * step; const x = cx + rr * Math.cos(a); const y = cy + rr * Math.sin(a); p += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`); }
      return p + " Z";
    })() },
  { id: "maple_leaf_simple", name: "Maple Leaf (simple)", category: "Plants", path: "M50 15 L58 28 L72 26 L66 38 L78 44 L64 48 L68 62 L54 54 L50 70 L46 54 L32 62 L36 48 L22 44 L34 38 L28 26 L42 28 Z" },
  { id: "cedar_simple", name: "Cedar Tree (simple)", category: "Plants", path: "M50 18 L65 28 L55 28 L70 36 L58 36 L75 44 L58 44 L82 54 L50 54 L18 54 L42 44 L25 44 L42 36 L30 36 L45 28 L35 28 Z M46 54 V82 H54 V54 Z" },
];
