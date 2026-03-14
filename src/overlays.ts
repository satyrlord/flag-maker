/* ──────────────────────────────────────────────
   Flag Maker – Overlay Builder Helpers
   ────────────────────────────────────────────── */

import type { Overlay } from "./types";
import { RENDERABLE_OVERLAY_TYPE_IDS } from "./overlayTypeConfig";
import { uid } from "./utils";

export const SUPPORTED_OVERLAY_TYPES = RENDERABLE_OVERLAY_TYPE_IDS;

export function rectOverlay({
  xPct, yPct, wPct, hPct, fill,
  stroke = "#0000", strokeWidth = 0, rotation = 0, opacity = 1,
}: {
  xPct: number; yPct: number; wPct: number; hPct: number;
  fill: string; stroke?: string; strokeWidth?: number; rotation?: number; opacity?: number;
}): Overlay {
  return {
    id: uid(), type: "rectangle",
    x: xPct, y: yPct, w: wPct, h: hPct,
    rotation, fill, stroke, strokeWidth, opacity,
  };
}

export function circleOverlay({
  xPct, yPct, sizePct, fill,
  stroke = "#0000", strokeWidth = 0, opacity = 1,
}: {
  xPct: number; yPct: number; sizePct: number;
  fill: string; stroke?: string; strokeWidth?: number; opacity?: number;
}): Overlay {
  return {
    id: uid(), type: "circle",
    x: xPct, y: yPct, w: sizePct, h: sizePct,
    rotation: 0, fill, stroke, strokeWidth, opacity,
  };
}

export function polyOverlay(
  points: Array<[number, number]>,
  fill: string,
): Overlay {
  const d = `M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
  return {
    id: uid(), type: "custom",
    x: 50, y: 50, w: 100, h: 100,
    rotation: 0, fill, stroke: "#0000", strokeWidth: 0, opacity: 1,
    path: d,
  };
}

/**
 * A rotated band (rectangle) from point A → B.
 * Thickness is % of flag HEIGHT. Rotation compensates for aspect ratio.
 */
export function makeBandSegment(
  x1Pct: number, y1Pct: number,
  x2Pct: number, y2Pct: number,
  thicknessPct: number,
  fill: string,
  ratio: [number, number],
): Overlay {
  const [rh, rw] = ratio;
  const hw = rh / rw;
  const dx = x2Pct - x1Pct;
  const dy = y2Pct - y1Pct;
  const lengthPct = Math.sqrt(dx * dx + (dy * hw) * (dy * hw));
  const angle = (Math.atan2(dy * hw, dx) * 180) / Math.PI;
  return {
    id: uid(), type: "rectangle",
    x: (x1Pct + x2Pct) / 2, y: (y1Pct + y2Pct) / 2,
    w: lengthPct, h: thicknessPct,
    rotation: angle, fill, stroke: "#0000", strokeWidth: 0, opacity: 1,
  };
}

export function starfieldOverlay({
  xPct, yPct, wPct, hPct, fill,
  starCount = 12, starPoints = 5, starPointLength = 0.38,
  starSize = 50, starDistribution = "ring",
  starRotateWithPosition = false, starCols = 6,
  opacity = 1,
}: {
  xPct: number; yPct: number; wPct: number; hPct: number;
  fill: string;
  starCount?: number; starPoints?: number; starPointLength?: number;
  starSize?: number; starDistribution?: string;
  starRotateWithPosition?: boolean; starCols?: number;
  opacity?: number;
}): Overlay {
  return {
    id: uid(), type: "starfield",
    x: xPct, y: yPct, w: wPct, h: hPct,
    rotation: 0, fill, stroke: "#0000", strokeWidth: 0, opacity,
    starCount, starPoints, starPointLength, starSize,
    starDistribution, starRotateWithPosition, starCols,
  };
}
