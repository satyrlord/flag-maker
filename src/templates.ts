/* ──────────────────────────────────────────────
   Flag Maker – Division & National Flag Templates
   ────────────────────────────────────────────── */

import type { Orientation, Overlay } from "./types";
import { starPath, uid } from "./utils";
import { rectOverlay, circleOverlay, polyOverlay, makeBandSegment, starfieldOverlay } from "./overlays";
import flagConfigs from "./config/un-flags.json";

export interface TemplateCfg {
  orientation?: Orientation;
  ratio: [number, number];
  sections: number;
  colors: string[];
  weights?: number[];
  overlays: Overlay[];
}

const DIVISION_GRAYSCALE = {
  darkest: "#1F1F1F",
  dark: "#4A4A4A",
  mid: "#7F7F7F",
  light: "#B8B8B8",
  lightest: "#EFEFEF",
} as const;

/* ── Division Templates ── */

export function templatePerPale(): TemplateCfg {
  return {
    ratio: [2, 3],
    sections: 2,
    colors: [DIVISION_GRAYSCALE.darkest, DIVISION_GRAYSCALE.lightest],
    weights: [1, 1],
    overlays: [],
    orientation: "vertical",
  };
}

export function templatePerFess(): TemplateCfg {
  return {
    ratio: [2, 3],
    sections: 2,
    colors: [DIVISION_GRAYSCALE.dark, DIVISION_GRAYSCALE.lightest],
    weights: [1, 1],
    overlays: [],
    orientation: "horizontal",
  };
}

export function templateTricolorVertical(): TemplateCfg {
  return {
    ratio: [2, 3],
    sections: 3,
    colors: [DIVISION_GRAYSCALE.darkest, DIVISION_GRAYSCALE.mid, DIVISION_GRAYSCALE.lightest],
    weights: [1, 1, 1],
    overlays: [],
    orientation: "vertical",
  };
}

export function templateTricolorHorizontal(): TemplateCfg {
  return {
    ratio: [2, 3],
    sections: 3,
    colors: [DIVISION_GRAYSCALE.darkest, DIVISION_GRAYSCALE.mid, DIVISION_GRAYSCALE.lightest],
    weights: [1, 1, 1],
    overlays: [],
    orientation: "horizontal",
  };
}

export function templateQuartered(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: [DIVISION_GRAYSCALE.darkest], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 25, yPct: 25, wPct: 50, hPct: 50, fill: DIVISION_GRAYSCALE.darkest }),
      rectOverlay({ xPct: 75, yPct: 25, wPct: 50, hPct: 50, fill: DIVISION_GRAYSCALE.lightest }),
      rectOverlay({ xPct: 25, yPct: 75, wPct: 50, hPct: 50, fill: DIVISION_GRAYSCALE.lightest }),
      rectOverlay({ xPct: 75, yPct: 75, wPct: 50, hPct: 50, fill: DIVISION_GRAYSCALE.dark }),
    ],
  };
}

export function templatePerBend(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: [DIVISION_GRAYSCALE.lightest],
    overlays: [
      polyOverlay([[0, 0], [50, 50], [0, 100]], DIVISION_GRAYSCALE.darkest),
      polyOverlay([[100, 0], [100, 100], [50, 50]], DIVISION_GRAYSCALE.light),
    ],
  };
}

export function templatePerBendSinister(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: [DIVISION_GRAYSCALE.lightest],
    overlays: [
      polyOverlay([[0, 0], [100, 0], [50, 50]], DIVISION_GRAYSCALE.darkest),
      polyOverlay([[50, 50], [0, 100], [100, 100]], DIVISION_GRAYSCALE.light),
    ],
  };
}

export function templatePerSaltire(): TemplateCfg {
  const ratio: [number, number] = [2, 3];
  return {
    ratio, sections: 1, colors: [DIVISION_GRAYSCALE.lightest],
    overlays: [
      makeBandSegment(0, 0, 100, 100, 18, DIVISION_GRAYSCALE.darkest, ratio),
      makeBandSegment(0, 100, 100, 0, 18, DIVISION_GRAYSCALE.mid, ratio),
    ],
  };
}

export function templateCenteredCross(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: [DIVISION_GRAYSCALE.darkest],
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 18, fill: DIVISION_GRAYSCALE.lightest }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 18, hPct: 100, fill: DIVISION_GRAYSCALE.lightest }),
    ],
  };
}

export function templateNordicCross(): TemplateCfg {
  return {
    ratio: [2, 3], sections: 1, colors: [DIVISION_GRAYSCALE.dark],
    overlays: [
      rectOverlay({ xPct: 36, yPct: 50, wPct: 12, hPct: 100, fill: DIVISION_GRAYSCALE.lightest }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 12, fill: DIVISION_GRAYSCALE.lightest }),
    ],
  };
}

function centeredCrossTemplate(
  ratio: [number, number],
  fieldFill: string,
  crossFill: string,
  crossWidthPct: number,
): TemplateCfg {
  return {
    ratio,
    sections: 1,
    colors: [fieldFill],
    orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: crossWidthPct, fill: crossFill }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: crossWidthPct, hPct: 100, fill: crossFill }),
    ],
  };
}

function saltireTemplate(
  ratio: [number, number],
  fieldFill: string,
  saltireFill: string,
  saltireWidthPct: number,
): TemplateCfg {
  return {
    ratio,
    sections: 1,
    colors: [fieldFill],
    orientation: "horizontal",
    overlays: [
      makeBandSegment(0, 0, 100, 100, saltireWidthPct, saltireFill, ratio),
      makeBandSegment(0, 100, 100, 0, saltireWidthPct, saltireFill, ratio),
    ],
  };
}

function bavarianLozenges(rows: number, cols: number, fill: string): Overlay[] {
  const overlays: Overlay[] = [];
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;
  for (let row = 0; row < rows; row += 1) {
    const centerY = row * cellHeight + cellHeight / 2;
    const offsetX = row % 2 === 0 ? cellWidth / 2 : 0;
    for (let col = 0; col <= cols; col += 1) {
      if ((row + col) % 2 !== 0) {
        continue;
      }
      const centerX = col * cellWidth + offsetX;
      overlays.push(polyOverlay([
        [centerX, centerY - cellHeight / 2],
        [centerX + cellWidth / 2, centerY],
        [centerX, centerY + cellHeight / 2],
        [centerX - cellWidth / 2, centerY],
      ], fill));
    }
  }
  return overlays;
}

export function templateEngland(): TemplateCfg {
  return centeredCrossTemplate([3, 5], "#FFFFFF", "#CE1126", 20);
}

export function templateScotland(): TemplateCfg {
  return saltireTemplate([3, 5], "#0065BD", "#FFFFFF", 18);
}

export function templateWales(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 2,
    colors: ["#FFFFFF", "#00A651"],
    weights: [1, 1],
    orientation: "horizontal",
    overlays: [
      {
        id: uid(),
        type: "symbol",
        symbolId: "dragon_heraldic",
        x: 50,
        y: 49,
        w: 56,
        h: 62,
        rotation: 0,
        fill: "#D21034",
        stroke: "#0000",
        strokeWidth: 0,
        opacity: 1,
      },
    ],
  };
}

export function templateNorthernIreland(): TemplateCfg {
  return saltireTemplate([3, 5], "#FFFFFF", "#CC0000", 16);
}

export function templateCatalunya(): TemplateCfg {
  return {
    ratio: [2, 3],
    sections: 9,
    colors: ["#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09", "#DA121A", "#FCDD09"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateEuskadi(): TemplateCfg {
  const ratio: [number, number] = [14, 25];
  return {
    ratio,
    sections: 1,
    colors: ["#D52B1E"],
    orientation: "horizontal",
    overlays: [
      makeBandSegment(0, 0, 100, 100, 20, "#009B48", ratio),
      makeBandSegment(0, 100, 100, 0, 20, "#009B48", ratio),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 14, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 14, hPct: 100, fill: "#FFFFFF" }),
    ],
  };
}

export function templateBavaria(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 1,
    colors: ["#FFFFFF"],
    orientation: "horizontal",
    overlays: bavarianLozenges(6, 10, "#75AADB"),
  };
}

/* ── National Flag Templates ── */

export function templateUS(): TemplateCfg {
  const RED = "#B31942", WHITE = "#FFFFFF", BLUE = "#002868";
  const ratio: [number, number] = [10, 19];
  const sections = 13;
  const colors = Array.from({ length: sections }, (_, i) => (i % 2 === 0 ? RED : WHITE));

  const cantonW = 40;                     // 2/5 of flag width
  const cantonH = (7 / 13) * 100;         // 7/13 of flag height

  return {
    ratio, sections, colors, orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: cantonW / 2, yPct: cantonH / 2, wPct: cantonW, hPct: cantonH, fill: BLUE }),
      starfieldOverlay({
        xPct: cantonW / 2, yPct: cantonH / 2, wPct: cantonW * 0.9, hPct: cantonH * 0.9,
        fill: WHITE, starCount: 50, starDistribution: "staggered-grid",
        starCols: 6, starPoints: 5, starPointLength: 0.38, starSize: 50,
      }),
    ],
  };
}

export function templateIceland(): TemplateCfg {
  return {
    ratio: [18, 25], sections: 1, colors: ["#003897"], orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 36, yPct: 50, wPct: 16, hPct: 100, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 22.2, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 36, yPct: 50, wPct: 8, hPct: 100, fill: "#D72828" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 11.1, fill: "#D72828" }),
    ],
  };
}

export function templateUruguay(): TemplateCfg {
  const WHITE = "#FFFFFF", BLUE = "#0038A8";
  const sections = 9;
  const colors = Array.from({ length: sections }, (_, i) => (i % 2 === 0 ? WHITE : BLUE));
  const ratio: [number, number] = [2, 3];
  const cantonH = (5 / 9) * 100;
  const cantonW = cantonH * (ratio[0] / ratio[1]);
  return {
    ratio, sections, colors, orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: cantonW / 2, yPct: cantonH / 2, wPct: cantonW, hPct: cantonH, fill: WHITE }),
      { id: uid(), type: "symbol", symbolId: "sol_de_mayo", x: cantonW / 2, y: cantonH / 2, w: cantonW * 0.75, h: cantonH * 0.75, rotation: 0, fill: "#FCD116", stroke: "#0000", strokeWidth: 0, opacity: 1 },
    ],
  };
}

export function templateDRC(): TemplateCfg {
  const ratio: [number, number] = [2, 3];
  return {
    ratio, sections: 1, colors: ["#00A3DD"], orientation: "horizontal",
    overlays: [
      makeBandSegment(100, 0, 0, 100, 26, "#F7D618", ratio),
      makeBandSegment(100, 0, 0, 100, 20, "#D21034", ratio),
      { id: uid(), type: "symbol", symbolId: "star_five_pointed", x: 15, y: 15, w: 18, h: 18, rotation: 0, fill: "#F7D618", stroke: "#0000", strokeWidth: 0, opacity: 1 },
    ],
  };
}

export function templateUK(): TemplateCfg {
  return nationalFlagTemplate("united_kingdom")!();
}

export function templateSouthAfrica(): TemplateCfg {
  return nationalFlagTemplate("south_africa")!();
}

/* ── Data-Driven National Flag Templates ── */

export interface OverlayCfg {
  type: string;
  x?: number; y?: number; w?: number; h?: number;
  size?: number;
  path?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  opacity?: number;
  // star
  points?: number | Array<[number, number]>;
  pointLength?: number;
  // symbol
  symbolId?: string;
  // band
  x1?: number; y1?: number; x2?: number; y2?: number;
  thickness?: number;
  // starfield
  starCount?: number;
  starPoints?: number;
  starPointLength?: number;
  starSize?: number;
  distribution?: string;
  starCols?: number;
}

interface FlagCfgEntry {
  id: string;
  name: string;
  ratio: [number, number];
  orientation?: Orientation;
  sections: number;
  colors: string[];
  weights?: number[];
  overlays?: OverlayCfg[];
}

export function buildOverlay(o: OverlayCfg, ratio: [number, number]): Overlay {
  switch (o.type) {
    case "rectangle":
      return rectOverlay({
        xPct: o.x ?? 50, yPct: o.y ?? 50,
        wPct: o.w ?? 100, hPct: o.h ?? 100,
        fill: o.fill ?? "#000000",
        rotation: o.rotation, opacity: o.opacity,
      });
    case "circle": {
      const ov = circleOverlay({
        xPct: o.x ?? 50, yPct: o.y ?? 50,
        sizePct: o.w ?? o.size ?? 20,
        fill: o.fill ?? "#000000",
        opacity: o.opacity,
      });
      if (o.h != null) ov.h = o.h;
      return ov;
    }
    case "polygon":
      return polyOverlay(
        o.points as Array<[number, number]>,
        o.fill ?? "#000000",
      );
    case "custom":
      return {
        id: uid(), type: "custom",
        x: o.x ?? 50, y: o.y ?? 50, w: o.w ?? 100, h: o.h ?? 100,
        rotation: o.rotation ?? 0,
        fill: o.fill ?? "#000000",
        stroke: o.stroke ?? "#0000", strokeWidth: o.strokeWidth ?? 0,
        opacity: o.opacity ?? 1,
        path: o.path ?? "",
      };
    case "band":
      return makeBandSegment(
        o.x1 ?? 0, o.y1 ?? 0,
        o.x2 ?? 100, o.y2 ?? 100,
        o.thickness ?? 10,
        o.fill ?? "#000000",
        ratio,
      );
    case "star": {
      const pts = typeof o.points === "number" ? o.points : 5;
      const pl = o.pointLength ?? 0.38;
      const sz = o.w ?? o.h ?? o.size ?? 10;
      const outer = sz / 2;
      const inner = outer * pl;
      return {
        id: uid(), type: "custom",
        x: 50, y: 50, w: 100, h: 100,
        rotation: o.rotation ?? 0,
        path: starPath(o.x ?? 50, o.y ?? 50, outer, inner, pts),
        fill: o.fill ?? "#FFFFFF",
        stroke: o.stroke ?? "#0000", strokeWidth: o.strokeWidth ?? 0,
        opacity: o.opacity ?? 1,
      };
    }
    case "starfield":
      return starfieldOverlay({
        xPct: o.x ?? 50, yPct: o.y ?? 50,
        wPct: o.w ?? 50, hPct: o.h ?? 50,
        fill: o.fill ?? "#FFFFFF",
        starCount: o.starCount ?? 12,
        starPoints: o.starPoints ?? 5,
        starPointLength: o.starPointLength ?? 0.38,
        starSize: o.starSize ?? 50,
        starDistribution: o.distribution ?? "ring",
        starCols: o.starCols,
        opacity: o.opacity,
      });
    case "symbol":
      return {
        id: uid(), type: "symbol",
        symbolId: o.symbolId ?? "",
        x: o.x ?? 50, y: o.y ?? 50,
        w: o.w ?? 30, h: o.h ?? 30,
        rotation: o.rotation ?? 0,
        fill: o.fill ?? "#000000",
        stroke: o.stroke ?? "#0000", strokeWidth: o.strokeWidth ?? 0,
        opacity: o.opacity ?? 1,
      };
    default:
      return rectOverlay({
        xPct: o.x ?? 50, yPct: o.y ?? 50,
        wPct: o.w ?? 100, hPct: o.h ?? 100,
        fill: o.fill ?? "#000000",
      });
  }
}

function templateFromFlagConfig(entry: FlagCfgEntry): TemplateCfg {
  const ratio = entry.ratio as [number, number];
  const overlays = (entry.overlays ?? []).map((o) => buildOverlay(o, ratio));
  return {
    orientation: entry.orientation ?? "horizontal",
    ratio,
    sections: entry.sections,
    colors: entry.colors,
    weights: entry.weights,
    overlays,
  };
}

/** All data-driven national flag configs indexed by id. */
const FLAG_CONFIG_MAP = new Map<string, FlagCfgEntry>(
  (flagConfigs as FlagCfgEntry[]).map((f) => [f.id, f]),
);

/**
 * Create a template factory for a given national flag ID.
 * Returns null if the ID is not found in the config.
 */
export function nationalFlagTemplate(id: string): (() => TemplateCfg) | null {
  const entry = FLAG_CONFIG_MAP.get(id);
  if (!entry) return null;
  return () => templateFromFlagConfig(entry);
}

/** All national flag config entries. */
export const NATIONAL_FLAG_CONFIGS: ReadonlyArray<{ id: string; name: string }> =
  (flagConfigs as FlagCfgEntry[]).map((f) => ({ id: f.id, name: f.name }));

const STATE_LEVEL_FACTORIES: Record<string, () => TemplateCfg> = {
  england: templateEngland,
  scotland: templateScotland,
  wales: templateWales,
  northern_ireland: templateNorthernIreland,
  catalunya: templateCatalunya,
  euskadi: templateEuskadi,
  bavaria: templateBavaria,
};

export function stateLevelFlagTemplate(id: string): (() => TemplateCfg) | null {
  return STATE_LEVEL_FACTORIES[id] ?? null;
}
