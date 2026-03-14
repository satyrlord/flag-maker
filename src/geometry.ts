/* ──────────────────────────────────────────────
   Flag Maker – Flag geometry computations
   ────────────────────────────────────────────── */

import type { Orientation, StripeRect } from "./types";
import leftbarConfig from "./config/leftbar-config.json";
import { parseRatio } from "./ratio";

export const VIEW_W = 1200;

/** Default flag aspect ratio [height, width]. Derived from leftbar-config.json defaultRatio. */
export const DEFAULT_RATIO: [number, number] = parseRatio(leftbarConfig.defaultRatio);

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
