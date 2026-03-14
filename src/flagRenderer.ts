/* ──────────────────────────────────────────────
   Flag Maker – Flag SVG Renderer
   Pure rendering module: FlagDesign → SVGSVGElement.
   No knowledge of panels, buttons, or event handlers.
   ────────────────────────────────────────────── */

import type { FlagDesign, Overlay, SymbolDef } from "./types";
import { overlayLayerGroup } from "./types";
import { VIEW_W, computeViewH, computeStripeRects, DEFAULT_RATIO } from "./geometry";
import { starPath } from "./utils";
import { BUILTIN_SYMBOLS } from "./symbols";
import { normalizeImportedSymbol } from "./symbolLoader";

const NS = "http://www.w3.org/2000/svg";

/** Fraction of the bounding box radius used for ring/arc star placement. */
const RING_RADIUS_RATIO = 0.8;
/** Stars are sized so their diameter fits ~2.5 times across the available cell. */
const STAR_GAP_RATIO = 2.5;

/* ── Symbol Registry ── */

const symbolRegistry = new Map<string, SymbolDef>(
  BUILTIN_SYMBOLS.map((s) => [s.id, s]),
);

export function registerSymbols(defs: SymbolDef[]): void {
  for (const def of defs) {
    symbolRegistry.set(def.id, normalizeImportedSymbol(def));
  }
}

/* ── Current SVG reference (for export) ── */

let currentSvg: SVGSVGElement | null = null;

let currentRatio: [number, number] = [...DEFAULT_RATIO];

export function getCurrentSvg(): SVGSVGElement | null {
  return currentSvg;
}

/**
 * Returns the aspect ratio used in the most recent renderFlag() call as a
 * [height, width] tuple.  A defensive copy is returned so callers cannot
 * mutate the internal state -- mutating it would corrupt ratio tracking
 * across subsequent renders and produce incorrect export scales.
 */
export function getCurrentRatio(): [number, number] {
  return [...currentRatio] as [number, number];
}

/* ── Starfield Position Computation ── */

interface StarPosition {
  x: number;  // local x within bounding box
  y: number;  // local y within bounding box
  rotation: number; // degrees
}

interface StaggeredRow {
  count: number;
  offset: number; // 0 = no offset, 0.5 = half-cell offset (short rows)
}

/**
 * Build the row definitions for a US-style staggered grid:
 * odd rows have `cols` stars, even rows have `cols - 1` stars offset by half a cell.
 */
function buildStaggeredRows(starCount: number, cols: number): StaggeredRow[] {
  const longCols = Math.min(cols, starCount);
  const shortCols = longCols - 1;
  let remaining = starCount;
  const rows: StaggeredRow[] = [];
  while (remaining > 0) {
    const n = Math.min(longCols, remaining);
    rows.push({ count: n, offset: 0 });
    remaining -= n;
    if (remaining > 0) {
      const m = Math.min(shortCols, remaining);
      rows.push({ count: m, offset: 0.5 });
      remaining -= m;
    }
  }
  return rows;
}

/**
 * Compute star center positions within a bounding box of size (bw, bh).
 * Positions are in local coordinates (0,0) = top-left of bounding box.
 */
export function computeStarPositions(ov: Overlay, bw: number, bh: number): StarPosition[] {
  const count = ov.starCount ?? 12;
  const dist = ov.starDistribution ?? "ring";
  const cols = ov.starCols ?? 6;
  const rotate = ov.starRotateWithPosition ?? false;
  const positions: StarPosition[] = [];

  if (dist === "ring") {
    const rx = bw / 2 * RING_RADIUS_RATIO;
    const ry = bh / 2 * RING_RADIUS_RATIO;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      positions.push({
        x: bw / 2 + rx * Math.cos(angle),
        y: bh / 2 + ry * Math.sin(angle),
        rotation: rotate ? (angle * 180) / Math.PI + 90 : 0,
      });
    }
  } else if (dist === "grid") {
    const c = Math.min(cols, count);
    const rows = Math.ceil(count / c);
    const cellW = bw / c;
    const cellH = bh / rows;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / c);
      const col = i % c;
      positions.push({
        x: (col + 0.5) * cellW,
        y: (row + 0.5) * cellH,
        rotation: 0,
      });
    }
  } else if (dist === "staggered-grid") {
    const longCols = Math.min(cols, count);
    const rowDefs = buildStaggeredRows(count, cols);
    const cellW = bw / longCols;
    const cellH = bh / rowDefs.length;

    for (let r = 0; r < rowDefs.length; r++) {
      const def = rowDefs[r];
      for (let c = 0; c < def.count; c++) {
        positions.push({
          x: (c + 0.5 + def.offset) * cellW,
          y: (r + 0.5) * cellH,
          rotation: 0,
        });
      }
    }
  } else if (dist === "line") {
    const spacing = bw / count;
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (i + 0.5) * spacing,
        y: bh / 2,
        rotation: 0,
      });
    }
  } else if (dist === "arc") {
    const arcSpan = Math.PI / 2; // 90-degree arc
    const startAngle = -Math.PI / 2 - arcSpan / 2;
    const rx = bw / 2 * RING_RADIUS_RATIO;
    const ry = bh / 2 * RING_RADIUS_RATIO;
    for (let i = 0; i < count; i++) {
      const frac = count > 1 ? i / (count - 1) : 0.5;
      const angle = startAngle + frac * arcSpan;
      positions.push({
        x: bw / 2 + rx * Math.cos(angle),
        y: bh / 2 + ry * Math.sin(angle),
        rotation: rotate ? (angle * 180) / Math.PI + 90 : 0,
      });
    }
  }

  return positions;
}

/**
 * Compute the "natural" star outer radius for a given distribution,
 * so stars fill the space nicely without overlapping.
 */
function computeNaturalRadius(ov: Overlay, bw: number, bh: number, starCount: number): number {
  const dist = ov.starDistribution ?? "ring";
  const cols = ov.starCols ?? 6;

  if (dist === "ring") {
    const avgRadius = (bw + bh) / 4 * RING_RADIUS_RATIO;
    const circumference = 2 * Math.PI * avgRadius;
    return circumference / (starCount * STAR_GAP_RATIO);
  } else if (dist === "grid") {
    const c = Math.min(cols, starCount);
    const rows = Math.ceil(starCount / c);
    const cellW = bw / c;
    const cellH = bh / rows;
    return Math.min(cellW, cellH) / STAR_GAP_RATIO;
  } else if (dist === "staggered-grid") {
    const longCols = Math.min(cols, starCount);
    const totalRows = buildStaggeredRows(starCount, cols).length;
    const cellW = bw / longCols;
    const cellH = bh / totalRows;
    return Math.min(cellW, cellH) / STAR_GAP_RATIO;
  } else if (dist === "line") {
    const cellW = bw / starCount;
    return Math.min(cellW, bh) / STAR_GAP_RATIO;
  } else if (dist === "arc") {
    const avgRadius = (bw + bh) / 4 * RING_RADIUS_RATIO;
    const arcLen = avgRadius * (Math.PI / 2);
    return arcLen / (starCount * STAR_GAP_RATIO);
  }
  return Math.min(bw, bh) / 10;
}

/* ── Overlay Renderer ── */

function renderOverlay(ov: Overlay, vw: number, vh: number): SVGElement | null {
  const cx = (ov.x / 100) * vw;
  const cy = (ov.y / 100) * vh;
  const ow = (ov.w / 100) * vw;
  const oh = (ov.h / 100) * vh;

  let el: SVGElement | null = null;
  let applyCommonFill = true;

  if (ov.type === "rectangle") {
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", String(cx - ow / 2));
    rect.setAttribute("y", String(cy - oh / 2));
    rect.setAttribute("width", String(ow));
    rect.setAttribute("height", String(oh));
    if (ov.rotation) {
      rect.setAttribute("transform", `rotate(${ov.rotation} ${cx} ${cy})`);
    }
    el = rect;
  } else if (ov.type === "circle") {
    const ellipse = document.createElementNS(NS, "ellipse");
    ellipse.setAttribute("cx", String(cx));
    ellipse.setAttribute("cy", String(cy));
    ellipse.setAttribute("rx", String(ow / 2));
    ellipse.setAttribute("ry", String(oh / 2));
    if (ov.rotation) {
      ellipse.setAttribute("transform", `rotate(${ov.rotation} ${cx} ${cy})`);
    }
    el = ellipse;
  } else if (ov.type === "custom" && ov.path) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", ov.path);
    path.setAttribute("transform", `scale(${vw / 100} ${vh / 100})`);
    el = path;
  } else if (ov.type === "symbol") {
    applyCommonFill = false;
    const sym = ov.symbolId ? symbolRegistry.get(ov.symbolId) : undefined;
    if (!sym) return null;

    const nested = document.createElementNS(NS, "svg");
    nested.setAttribute("x", String(cx - ow / 2));
    nested.setAttribute("y", String(cy - oh / 2));
    nested.setAttribute("width", String(ow));
    nested.setAttribute("height", String(oh));
    nested.setAttribute("viewBox", sym.viewBox ?? "0 0 100 100");
    nested.setAttribute("preserveAspectRatio", "xMidYMid meet");
    nested.setAttribute("overflow", "visible");

    if (sym.svg) {
      // Emblem with curated inner SVG markup (from symbols.json)
      // Set color so currentColor fills resolve to the overlay fill
      nested.style.color = ov.fill;
      nested.innerHTML = sym.svg;
    } else if (sym.path) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", sym.path);
      path.setAttribute("fill", ov.fill);
      if (sym.fillRule) path.setAttribute("fill-rule", sym.fillRule);
      nested.appendChild(path);
    } else if (sym.generator === "star5") {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", starPath(50, 50, 40, 16));
      path.setAttribute("fill", ov.fill);
      nested.appendChild(path);
    }

    if (ov.rotation) {
      nested.setAttribute("transform", `rotate(${ov.rotation} ${cx} ${cy})`);
    }

    el = nested;
  } else if (ov.type === "starfield") {
    applyCommonFill = false;
    const g = document.createElementNS(NS, "g");
    const positions = computeStarPositions(ov, ow, oh);
    const points = ov.starPoints ?? 5;
    const pointLen = ov.starPointLength ?? 0.38;
    const sizeRatio = (ov.starSize ?? 50) / 100;

    // Compute natural radius based on distribution
    const naturalR = computeNaturalRadius(ov, ow, oh, positions.length);
    const outerR = naturalR * sizeRatio;
    const innerR = outerR * pointLen;

    for (const pos of positions) {
      const sx = cx - ow / 2 + pos.x;
      const sy = cy - oh / 2 + pos.y;
      const d = starPath(sx, sy, outerR, innerR, points);
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", ov.fill);
      if (pos.rotation) {
        p.setAttribute("transform", `rotate(${pos.rotation} ${sx} ${sy})`);
      }
      g.appendChild(p);
    }

    if (ov.rotation) {
      g.setAttribute("transform", `rotate(${ov.rotation} ${cx} ${cy})`);
    }
    el = g;
  }

  if (!el) return null;

  if (applyCommonFill) {
    el.setAttribute("fill", ov.fill);
    if (ov.stroke !== "#0000" && ov.strokeWidth > 0) {
      el.setAttribute("stroke", ov.stroke);
      el.setAttribute("stroke-width", String(ov.strokeWidth));
    }
  }

  if (ov.opacity < 1) {
    el.setAttribute("opacity", String(ov.opacity));
  }

  return el;
}

/* ── Main Renderer ── */

export function renderFlag(design: FlagDesign): SVGSVGElement {
  const viewH = computeViewH(design.ratio);
  const svgEl = document.createElementNS(NS, "svg");
  svgEl.setAttribute("viewBox", `0 0 ${VIEW_W} ${viewH}`);
  // Intrinsic dimensions retained for export serialization; CSS overrides display size.
  svgEl.setAttribute("width", String(VIEW_W));
  svgEl.setAttribute("height", String(viewH));

  const rects = computeStripeRects(
    design.sections,
    design.weights,
    design.colors,
    design.orientation,
    viewH,
  );
  for (const r of rects) {
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", String(r.x));
    rect.setAttribute("y", String(r.y));
    rect.setAttribute("width", String(r.w));
    rect.setAttribute("height", String(r.h));
    rect.setAttribute("fill", r.fill);
    svgEl.appendChild(rect);
  }

  // Render overlays in layer group Z-order: shapes, starfields, then symbols.
  // Single pass to partition, then render each group in order.
  const shapeOverlays: Overlay[] = [];
  const starfieldOverlays: Overlay[] = [];
  const symbolOverlays: Overlay[] = [];
  for (const ov of design.overlays) {
    const g = overlayLayerGroup(ov);
    if (g === "overlays") shapeOverlays.push(ov);
    else if (g === "starfields") starfieldOverlays.push(ov);
    else symbolOverlays.push(ov);
  }
  for (const group of [shapeOverlays, starfieldOverlays, symbolOverlays]) {
    for (const ov of group) {
      if (ov.visible === false) continue;
      const el = renderOverlay(ov, VIEW_W, viewH);
      if (el) {
        el.setAttribute("data-overlay-id", ov.id);
        svgEl.appendChild(el);
      }
    }
  }

  currentSvg = svgEl;
  currentRatio = [...design.ratio];
  return svgEl;
}
