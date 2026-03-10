/* ──────────────────────────────────────────────
   Flag Maker – Grid Overlay
   Visual-only pixel grid overlay for the flag
   canvas. Not exported or saved. Renders a
   repeating grid using an SVG <pattern> element.
   ────────────────────────────────────────────── */

import gridConfig from "@/config/grid-config.json";
import type { GridSize } from "@/ui/gridConfig";

const SVG_NS = "http://www.w3.org/2000/svg";

/** All available grid sizes loaded from the config. */
export const GRID_SIZES: readonly GridSize[] = gridConfig.sizes;

/** Default grid size label (e.g. "5x5"). */
export const DEFAULT_GRID_SIZE: string = gridConfig.defaultSize;

/** The two grid colors users can cycle through. */
export const GRID_COLOR_CYAN = "#00ffff";
export const GRID_COLOR_MAGENTA = "#ff00ff";

/**
 * Compute an average luminance (0..1) from an array of hex color strings.
 * Used to pick a contrasting grid color. Returns 0 for an empty array.
 */
export function averageLuminance(colors: string[]): number {
  const totalLum = colors.reduce((acc, hex) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    // Relative luminance (ITU-R BT.709)
    return acc + 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, 0);
  return totalLum / Math.max(colors.length, 1);
}

/**
 * Choose a contrasting grid color based on flag background luminance.
 * Dark flags get cyan; light flags get magenta.
 */
export function pickGridColor(colors: string[]): string {
  const lum = averageLuminance(colors);
  return lum < 0.5 ? "#00ffff" : "#ff00ff";
}

/**
 * Create an SVG element that renders a grid overlay. This element is
 * positioned on top of the flag SVG and is purely visual.
 *
 * @param viewW   The viewBox width (e.g. 1200)
 * @param viewH   The viewBox height (derived from aspect ratio)
 * @param cellW   Grid cell width in viewBox units
 * @param cellH   Grid cell height in viewBox units
 * @param color   Grid line color (magenta or cyan)
 */
export function createGridSvg(
  viewW: number,
  viewH: number,
  cellW: number,
  cellH: number,
  color: string,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
  svg.setAttribute("width", String(viewW));
  svg.setAttribute("height", String(viewH));
  svg.classList.add("grid-overlay");

  const defs = document.createElementNS(SVG_NS, "defs");
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", "grid-pattern");
  pattern.setAttribute("width", String(cellW));
  pattern.setAttribute("height", String(cellH));
  pattern.setAttribute("patternUnits", "userSpaceOnUse");

  // Horizontal line (bottom edge of cell)
  const hLine = document.createElementNS(SVG_NS, "line");
  hLine.setAttribute("x1", "0");
  hLine.setAttribute("y1", String(cellH));
  hLine.setAttribute("x2", String(cellW));
  hLine.setAttribute("y2", String(cellH));
  hLine.setAttribute("stroke", color);
  hLine.setAttribute("stroke-width", "0.5");

  // Vertical line (right edge of cell)
  const vLine = document.createElementNS(SVG_NS, "line");
  vLine.setAttribute("x1", String(cellW));
  vLine.setAttribute("y1", "0");
  vLine.setAttribute("x2", String(cellW));
  vLine.setAttribute("y2", String(cellH));
  vLine.setAttribute("stroke", color);
  vLine.setAttribute("stroke-width", "0.5");

  pattern.appendChild(hLine);
  pattern.appendChild(vLine);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", String(viewW));
  rect.setAttribute("height", String(viewH));
  rect.setAttribute("fill", "url(#grid-pattern)");
  svg.appendChild(rect);

  return svg;
}
