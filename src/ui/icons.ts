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

/** Eye icon – layer visible. */
export const ICON_EYE = svg(
  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
  '<circle cx="12" cy="12" r="3"/>',
  14,
);

/** Eye-off icon – layer hidden. */
export const ICON_EYE_OFF = svg(
  '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
  '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
  '<line x1="1" y1="1" x2="23" y2="23"/>',
  14,
);

/** Lock icon – layer locked. */
export const ICON_LOCK = svg(
  '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
  '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  14,
);

/** Unlock icon – layer unlocked. */
export const ICON_UNLOCK = svg(
  '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
  '<path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  14,
);

/** Trash icon – delete layer. */
export const ICON_TRASH = svg(
  '<polyline points="3 6 5 6 21 6"/>' +
  '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  14,
);

/** Move up icon – raise layer Z-order. */
export const ICON_MOVE_UP = svg(
  '<polyline points="18 15 12 9 6 15"/>',
  14,
);

/** Move down icon – lower layer Z-order. */
export const ICON_MOVE_DOWN = svg(
  '<polyline points="6 9 12 15 18 9"/>',
  14,
);
/** Layer summary icon -- stripes (three horizontal lines). */
export const ICON_LAYER_STRIPES = svg(
  '<line x1="3" y1="7" x2="21" y2="7"/>' +
  '<line x1="3" y1="12" x2="21" y2="12"/>' +
  '<line x1="3" y1="17" x2="21" y2="17"/>',
  12,
);

/** Layer summary icon -- overlays (rect + circle). */
export const ICON_LAYER_OVERLAYS = svg(
  '<rect x="4" y="8" width="8" height="8" rx="1"/>' +
  '<circle cx="16" cy="12" r="4"/>',
  12,
);

/** Layer summary icon -- symbols (star). */
export const ICON_LAYER_SYMBOLS = svg(
  '<polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8"/>',
  12,
);

/** Layer summary icon -- starfields (multiple stars). */
export const ICON_LAYER_STARFIELDS = svg(
  '<polygon points="7 3 8.5 6 12 6.5 9.5 9 10 12.5 7 10.5 4 12.5 4.5 9 2 6.5 5.5 6"/>' +
  '<polygon points="17 10 18.5 13 22 13.5 19.5 16 20 19.5 17 17.5 14 19.5 14.5 16 12 13.5 15.5 13"/>',
  12,
);

/** Center horizontally icon -- vertical center line with left/right arrows. */
export const ICON_CENTER_H = svg(
  '<line x1="12" y1="3" x2="12" y2="21"/>' +
  '<polyline points="7 8 3 12 7 16"/>' +
  '<polyline points="17 8 21 12 17 16"/>',
);

/** Center vertically icon -- horizontal center line with up/down arrows. */
export const ICON_CENTER_V = svg(
  '<line x1="3" y1="12" x2="21" y2="12"/>' +
  '<polyline points="8 7 12 3 16 7"/>' +
  '<polyline points="8 17 12 21 16 17"/>',
);