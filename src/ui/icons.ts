/* ──────────────────────────────────────────────
   Flag Maker – Shared SVG Icon Helper
   ────────────────────────────────────────────── */

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Wrap SVG path markup in a Lucide-compatible inline icon string. */
export function svg(inner: string, size = 18): string {
  return (
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  );
}

function circles(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1" fill="currentColor" stroke="none"/>`)
    .join("");
}

/** Grip/drag-handle icon – 6-dot pattern. */
export const ICON_GRIP = svg(
  circles([
    [9, 5],
    [15, 5],
    [9, 12],
    [15, 12],
    [9, 19],
    [15, 19],
  ]),
  14,
);

/** Grid icon – 4x4 grid lines. */
export const ICON_GRID = svg(
  '<line x1="3" y1="3" x2="3" y2="21"/>' +
  '<line x1="9" y1="3" x2="9" y2="21"/>' +
  '<line x1="15" y1="3" x2="15" y2="21"/>' +
  '<line x1="21" y1="3" x2="21" y2="21"/>' +
  '<line x1="3" y1="3" x2="21" y2="3"/>' +
  '<line x1="3" y1="9" x2="21" y2="9"/>' +
  '<line x1="3" y1="15" x2="21" y2="15"/>' +
  '<line x1="3" y1="21" x2="21" y2="21"/>',
);
