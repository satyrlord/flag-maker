/* ──────────────────────────────────────────────
   Flag Maker – Flag SVG Renderer
   Pure rendering module: FlagDesign → SVGSVGElement.
   No knowledge of panels, buttons, or event handlers.
   ────────────────────────────────────────────── */

import type { FlagDesign, Overlay, SymbolDef } from "./types";
import { VIEW_W, computeViewH, computeStripeRects, DEFAULT_RATIO } from "./geometry";
import { starPath } from "./utils";
import { BUILTIN_SYMBOLS } from "./symbols";

const NS = "http://www.w3.org/2000/svg";

/* ── Symbol Registry ── */

const symbolRegistry = new Map<string, SymbolDef>(
  BUILTIN_SYMBOLS.map((s) => [s.id, s]),
);

export function registerSymbols(defs: SymbolDef[]): void {
  for (const def of defs) {
    symbolRegistry.set(def.id, def);
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
  } else if (ov.type === "star") {
    const outer = ow / 2;
    const inner = outer * 0.4;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", starPath(cx, cy, outer, inner));
    if (ov.rotation) {
      path.setAttribute("transform", `rotate(${ov.rotation} ${cx} ${cy})`);
    }
    el = path;
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

    if (sym.svg) {
      // Emblem with curated inner SVG markup (from symbols.json)
      nested.innerHTML = sym.svg;
    } else if (sym.path) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", sym.path);
      path.setAttribute("fill", ov.fill);
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
  svgEl.setAttribute("xmlns", NS);
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

  for (const ov of design.overlays) {
    const el = renderOverlay(ov, VIEW_W, viewH);
    if (el) svgEl.appendChild(el);
  }

  currentSvg = svgEl;
  currentRatio = [...design.ratio];
  return svgEl;
}
