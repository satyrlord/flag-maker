/* ──────────────────────────────────────────────
   Flag Maker – Division & National Flag Templates
   ────────────────────────────────────────────── */

import type { Orientation, Overlay } from "./types";
import { uid } from "./utils";
import { rectOverlay, polyOverlay, starOverlay, makeBandSegment } from "./overlays";

export interface TemplateCfg {
  orientation?: Orientation;
  ratio: [number, number];
  sections: number;
  colors: string[];
  weights?: number[];
  overlays: Overlay[];
}

/* ── Division Templates ── */

export function templatePerPale(): TemplateCfg {
  return { ratio: [2, 3], sections: 2, colors: ["#005BBB", "#FFD500"], weights: [1, 1], overlays: [], orientation: "vertical" };
}

export function templatePerFess(): TemplateCfg {
  return { ratio: [2, 3], sections: 2, colors: ["#CE1126", "#FFFFFF"], weights: [1, 1], overlays: [], orientation: "horizontal" };
}

export function templateTricolorVertical(): TemplateCfg {
  return { ratio: [2, 3], sections: 3, colors: ["#002395", "#FFFFFF", "#ED2939"], weights: [1, 1, 1], overlays: [], orientation: "vertical" };
}

export function templateTricolorHorizontal(): TemplateCfg {
  return { ratio: [2, 3], sections: 3, colors: ["#009246", "#FFFFFF", "#CE2B37"], weights: [1, 1, 1], overlays: [], orientation: "horizontal" };
}

export function templateQuartered(): TemplateCfg {
  return {
    ratio: [1, 2], sections: 1, colors: ["#00247D"], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 25, yPct: 25, wPct: 50, hPct: 50, fill: "#CF142B" }),
      rectOverlay({ xPct: 75, yPct: 25, wPct: 50, hPct: 50, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 25, yPct: 75, wPct: 50, hPct: 50, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 75, yPct: 75, wPct: 50, hPct: 50, fill: "#CF142B" }),
    ],
  };
}

export function templatePerBend(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: ["#FFFFFF"],
    overlays: [
      polyOverlay([[0, 0], [50, 50], [0, 100]], "#0038A8"),
      polyOverlay([[100, 0], [100, 100], [50, 50]], "#FCD116"),
    ],
  };
}

export function templatePerBendSinister(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: ["#FFFFFF"],
    overlays: [
      polyOverlay([[0, 0], [100, 0], [50, 50]], "#CE1126"),
      polyOverlay([[50, 50], [0, 100], [100, 100]], "#0038A8"),
    ],
  };
}

export function templatePerSaltire(): TemplateCfg {
  const ratio: [number, number] = [2, 3];
  return {
    ratio, sections: 1, colors: ["#FFFFFF"],
    overlays: [
      makeBandSegment(0, 0, 100, 100, 18, "#0038A8", ratio),
      makeBandSegment(0, 100, 100, 0, 18, "#FCD116", ratio),
    ],
  };
}

export function templatePerChevron(): TemplateCfg {
  const ratio: [number, number] = [2, 3];
  return {
    ratio, sections: 1, colors: ["#FFFFFF"],
    overlays: [
      makeBandSegment(0, 50, 60, 15, 20, "#007A4D", ratio),
      makeBandSegment(0, 50, 60, 85, 20, "#007A4D", ratio),
    ],
  };
}

export function templateCenteredCross(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: ["#00247D"],
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 18, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 18, hPct: 100, fill: "#FFFFFF" }),
    ],
  };
}

export function templateNordicCross(): TemplateCfg {
  return {
    ratio: [18, 25], sections: 1, colors: ["#003897"],
    overlays: [
      rectOverlay({ xPct: 28, yPct: 50, wPct: 10, hPct: 100, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 39, wPct: 100, hPct: 10, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 28, yPct: 50, wPct: 6, hPct: 100, fill: "#D72828" }),
      rectOverlay({ xPct: 50, yPct: 39, wPct: 100, hPct: 6, fill: "#D72828" }),
    ],
  };
}

/* ── National Flag Templates ── */

export function templateUS(viewW: number, viewH: number): TemplateCfg {
  const RED = "#B22234", WHITE = "#FFFFFF", BLUE = "#3C3B6E";
  const sections = 13;
  const colors = Array.from({ length: sections }, (_, i) => (i % 2 === 0 ? RED : WHITE));

  const cantonHeightFrac = 7 / 13;
  const cantonWidthFrac = 0.76 * (viewH / viewW);
  const cantonW = Math.min(100, cantonWidthFrac * 100);
  const cantonH = cantonHeightFrac * 100;
  const canton = rectOverlay({ xPct: cantonW / 2, yPct: cantonH / 2, wPct: cantonW, hPct: cantonH, fill: BLUE });

  const rows = 9;
  const marginX = 6, marginY = 6;
  const xStart6 = marginX, xEnd6 = 100 - marginX;
  const xStart5 = marginX + (xEnd6 - xStart6) / 12;
  const xEnd5 = 100 - marginX - (xEnd6 - xStart6) / 12;
  const yTop = marginY, yBot = 100 - marginY;
  const starSize = Math.min(cantonW, cantonH) * 0.06;

  const stars: Overlay[] = [];
  for (let r = 0; r < rows; r++) {
    const use6 = r % 2 === 0;
    const cols = use6 ? 6 : 5;
    const xStart = use6 ? xStart6 : xStart5;
    const xEnd = use6 ? xEnd6 : xEnd5;
    for (let c = 0; c < cols; c++) {
      const t = c / (cols - 1);
      const cx = xStart + t * (xEnd - xStart);
      const cy = yTop + (r / (rows - 1)) * (yBot - yTop);
      stars.push(starOverlay({ xPct: (cx / 100) * cantonW, yPct: (cy / 100) * cantonH, sizePct: starSize, fill: WHITE }));
    }
  }
  return { ratio: [10, 19], sections, colors, overlays: [canton, ...stars], orientation: "horizontal" };
}

export function templateIceland(): TemplateCfg {
  return {
    ratio: [18, 25], sections: 1, colors: ["#003897"], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 28, yPct: 50, wPct: 10, hPct: 100, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 39, wPct: 100, hPct: 10, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 28, yPct: 50, wPct: 6, hPct: 100, fill: "#D72828" }),
      rectOverlay({ xPct: 50, yPct: 39, wPct: 100, hPct: 6, fill: "#D72828" }),
    ],
  };
}

export function templateUruguay(): TemplateCfg {
  const WHITE = "#FFFFFF", BLUE = "#0038A8";
  const sections = 9;
  const colors = Array.from({ length: sections }, (_, i) => (i % 2 === 0 ? WHITE : BLUE));
  const cantonH = (5 / 9) * 100, cantonW = cantonH;
  return {
    ratio: [2, 3], sections, colors, orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: cantonW / 2, yPct: cantonH / 2, wPct: cantonW, hPct: cantonH, fill: WHITE }),
      { id: uid(), type: "symbol", symbolId: "sun_12", x: cantonW * 0.5, y: cantonH * 0.5, w: cantonW * 0.55, h: cantonH * 0.55, rotation: 0, fill: "#FCD116", stroke: "#8C6C00", strokeWidth: 6, opacity: 1 },
    ],
  };
}

export function templateDRC(): TemplateCfg {
  return {
    ratio: [3, 4], sections: 1, colors: ["#00A3DD"], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 150, hPct: 26, fill: "#F7D618", rotation: -35 }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 150, hPct: 20, fill: "#D21034", rotation: -35 }),
      starOverlay({ xPct: 20, yPct: 20, sizePct: 22, fill: "#F7D618" }),
    ],
  };
}

export function templateUK(): TemplateCfg {
  const BLUE = "#012169", WHITE = "#FFFFFF", RED = "#C8102E";
  return {
    ratio: [1, 2], sections: 1, colors: [BLUE], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 160, hPct: 18, fill: WHITE, rotation: 45 }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 160, hPct: 18, fill: WHITE, rotation: -45 }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 160, hPct: 10, fill: RED, rotation: 45 }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 160, hPct: 10, fill: RED, rotation: -45 }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 22, fill: WHITE }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 22, hPct: 100, fill: WHITE }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 12, fill: RED }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 12, hPct: 100, fill: RED }),
    ],
  };
}

export function templateSouthAfrica(): TemplateCfg {
  const GREEN = "#007A4D", BLACK = "#000000", GOLD = "#FFB612";
  const RED = "#DE3831", BLUE = "#002395", WHITE = "#FFFFFF";
  const ratio: [number, number] = [2, 3];
  const tG = 100 * (1 / 5), tW = 100 * (1 / 15), tY = 100 * (1 / 15);
  const tWhiteBand = tG + 2 * tW;
  const tGoldBand = tG + 2 * tY;

  const TL = { x: 0, y: 0 }, BL = { x: 0, y: 100 }, C = { x: 50, y: 50 }, FR = { x: 100, y: 50 };

  return {
    ratio, sections: 2, colors: [RED, BLUE], weights: [1, 1], orientation: "horizontal",
    overlays: [
      { id: uid(), type: "custom", x: 50, y: 50, w: 100, h: 100, rotation: 0, fill: BLACK, stroke: "#0000", strokeWidth: 0, opacity: 1, path: "M 0 0 L 0 100 L 50 50 Z" },
      makeBandSegment(TL.x, TL.y, C.x, C.y, tWhiteBand, WHITE, ratio),
      makeBandSegment(BL.x, BL.y, C.x, C.y, tWhiteBand, WHITE, ratio),
      makeBandSegment(C.x, C.y, FR.x, FR.y, tWhiteBand, WHITE, ratio),
      makeBandSegment(TL.x - 5, TL.y, C.x - 5, C.y, tGoldBand - 5, GOLD, ratio),
      makeBandSegment(BL.x, BL.y - 5, C.x, C.y - 5, tGoldBand - 5, GOLD, ratio),
      makeBandSegment(TL.x, TL.y, C.x, C.y, tG, GREEN, ratio),
      makeBandSegment(BL.x, BL.y, C.x, C.y, tG, GREEN, ratio),
      makeBandSegment(C.x, C.y, FR.x, FR.y, tG, GREEN, ratio),
    ],
  };
}
