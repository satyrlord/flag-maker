/* ──────────────────────────────────────────────
   Flag Maker – Flag geometry computations
   ────────────────────────────────────────────── */

import type { Orientation, StripeRect } from "./types";

export const VIEW_W = 1200;

/** Default flag aspect ratio [height, width]. Shared by the renderer initial state and the default flag design. */
export const DEFAULT_RATIO: [number, number] = [2, 3];

export function computeViewH(ratio: [number, number]): number {
  return Math.round((VIEW_W * ratio[0]) / ratio[1]);
}

export function computeStripeRects(
  sections: number,
  weights: number[],
  colors: string[],
  orientation: Orientation,
  viewH: number,
): StripeRect[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rects: StripeRect[] = [];
  let offset = 0;
  for (let i = 0; i < sections; i++) {
    const frac = weights[i] / totalWeight;
    if (orientation === "horizontal") {
      const h = viewH * frac;
      rects.push({ x: 0, y: offset, w: VIEW_W, h, fill: colors[i] });
      offset += h;
    } else {
      const w = VIEW_W * frac;
      rects.push({ x: offset, y: 0, w, h: viewH, fill: colors[i] });
      offset += w;
    }
  }
  return rects;
}
