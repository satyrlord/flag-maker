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
  const ratio: [number, number] = [2, 3];
  const crossHeightPct = 18;
  return {
    ratio, sections: 1, colors: [DIVISION_GRAYSCALE.darkest],
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: crossHeightPct, fill: DIVISION_GRAYSCALE.lightest }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: (crossHeightPct * ratio[0]) / ratio[1], hPct: 100, fill: DIVISION_GRAYSCALE.lightest }),
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
  horizontalCrossHeightPct: number,
): TemplateCfg {
  return {
    ratio,
    sections: 1,
    colors: [fieldFill],
    orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: horizontalCrossHeightPct, fill: crossFill }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: (horizontalCrossHeightPct * ratio[0]) / ratio[1], hPct: 100, fill: crossFill }),
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

function symbolFlagTemplate(
  ratio: [number, number],
  symbolId: string,
): TemplateCfg {
  return {
    ratio,
    sections: 1,
    colors: ["#FFFFFF"],
    orientation: "horizontal",
    overlays: [
      {
        id: uid(),
        type: "symbol",
        symbolId,
        x: 50,
        y: 50,
        w: 100,
        h: 100,
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "#0000",
        strokeWidth: 0,
        opacity: 1,
      },
    ],
  };
}

function normalizeViewBoxPoint(
  x: number,
  y: number,
  viewWidth: number,
  viewHeight: number,
): [number, number] {
  return [(x / viewWidth) * 100, (y / viewHeight) * 100];
}

function normalizedSemicirclePoints(
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number,
  viewWidth: number,
  viewHeight: number,
  steps = 32,
): Array<[number, number]> {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angleDegrees = startDegrees + ((endDegrees - startDegrees) * index) / steps;
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return normalizeViewBoxPoint(
      centerX + radius * Math.cos(angleRadians),
      centerY + radius * Math.sin(angleRadians),
      viewWidth,
      viewHeight,
    );
  });
}

export function templateEngland(): TemplateCfg {
  return centeredCrossTemplate([3, 5], "#FFFFFF", "#CE1126", 20);
}

export function templateScotland(): TemplateCfg {
  return saltireTemplate([3, 5], "#005EB8", "#FFFFFF", 20);
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
        symbolId: "wales_flag",
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
  return {
    ratio: [1, 2],
    sections: 1,
    colors: ["#FFFFFF"],
    orientation: "horizontal",
    overlays: [
      {
        id: uid(),
        type: "symbol",
        symbolId: "ulster_banner_flag",
        x: 50,
        y: 50,
        w: 100,
        h: 100,
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "#0000",
        strokeWidth: 0,
        opacity: 1,
      },
    ],
  };
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
  const crossWidthPctOfLength = 8.6;
  const crossWidthPctOfHeight = (43 / 280) * 100;
  return {
    ratio,
    sections: 1,
    colors: ["#D52B1E"],
    orientation: "horizontal",
    overlays: [
      makeBandSegment(0, 0, 100, 100, crossWidthPctOfHeight, "#009B48", ratio),
      makeBandSegment(0, 100, 100, 0, crossWidthPctOfHeight, "#009B48", ratio),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: crossWidthPctOfHeight, fill: "#FFFFFF" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: crossWidthPctOfLength, hPct: 100, fill: "#FFFFFF" }),
    ],
  };
}

export function templateBavaria(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "bavaria_lozengy_flag");
}

export function templateAland(): TemplateCfg {
  return {
    ratio: [17, 26],
    sections: 1,
    colors: ["#0064AD"],
    orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 40.3846153846, yPct: 50, wPct: 19.2307692308, hPct: 100, fill: "#FFD300" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 29.4117647059, fill: "#FFD300" }),
      rectOverlay({ xPct: 40.3846153846, yPct: 50, wPct: 7.6923076923, hPct: 100, fill: "#DA0E15" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 11.7647058824, fill: "#DA0E15" }),
    ],
  };
}

export function templateGuernsey(): TemplateCfg {
  return symbolFlagTemplate([2, 3], "guernsey_flag");
}

export function templateSardinia(): TemplateCfg {
  return symbolFlagTemplate([2, 3], "sardinia_flag");
}

export function templateCorsica(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "corsica_flag");
}

export function templateGenoa(): TemplateCfg {
  return centeredCrossTemplate([2, 3], "#FFFFFF", "#CE1126", 20);
}

export function templateVenice(): TemplateCfg {
  return symbolFlagTemplate([13, 25], "venice_flag");
}

export function templateFaroeIslands(): TemplateCfg {
  return {
    ratio: [8, 11],
    sections: 1,
    colors: ["#FFFFFF"],
    orientation: "horizontal",
    overlays: [
      rectOverlay({ xPct: 36.3636363636, yPct: 50, wPct: 18.1818181818, hPct: 100, fill: "#005EB8" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 25, fill: "#005EB8" }),
      rectOverlay({ xPct: 36.3636363636, yPct: 50, wPct: 9.0909090909, hPct: 100, fill: "#EF3340" }),
      rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 12.5, fill: "#EF3340" }),
    ],
  };
}

export function templateGreenland(): TemplateCfg {
  const upperSemicircle = normalizedSemicirclePoints(7, 6, 4, 180, 360, 18, 12);
  const lowerSemicircle = normalizedSemicirclePoints(7, 6, 4, 0, 180, 18, 12);

  return {
    ratio: [2, 3],
    sections: 2,
    colors: ["#FFFFFF", "#C8102E"],
    orientation: "horizontal",
    overlays: [
      polyOverlay(upperSemicircle, "#C8102E"),
      polyOverlay(lowerSemicircle, "#FFFFFF"),
    ],
  };
}

export function templateBadenWurttemberg(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 2,
    colors: ["#000000", "#F9C700"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateBremen(): TemplateCfg {
  const stripeColors = Array.from({ length: 8 }, (_, index) => (index % 2 === 0 ? "#DD0000" : "#FFFFFF"));
  const hoistColumnWidth = 8.3333333333;
  const stripeHeight = 12.5;

  return {
    ratio: [2, 3],
    sections: 8,
    colors: stripeColors,
    orientation: "horizontal",
    overlays: Array.from({ length: 8 }, (_, index) =>
      rectOverlay({
        xPct: hoistColumnWidth + hoistColumnWidth / 2,
        yPct: stripeHeight / 2 + stripeHeight * index,
        wPct: hoistColumnWidth,
        hPct: stripeHeight,
        fill: index % 2 === 0 ? "#FFFFFF" : "#DD0000",
      }),
    ),
  };
}

export function templateHesse(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 2,
    colors: ["#E10000", "#FFFFFF"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateNorthRhineWestphalia(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 3,
    colors: ["#009136", "#FFFFFF", "#E3001B"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateSchleswigHolstein(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 3,
    colors: ["#0039AD", "#FFFFFF", "#D61810"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateBerlin(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "berlin_flag");
}

export function templateBrandenburg(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "brandenburg_flag");
}

export function templateHamburg(): TemplateCfg {
  return symbolFlagTemplate([2, 3], "hamburg_flag");
}

export function templateLowerSaxony(): TemplateCfg {
  return symbolFlagTemplate([15, 23], "lower_saxony_flag");
}

export function templateMecklenburgVorpommern(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 5,
    colors: ["#003893", "#FFFFFF", "#F5E100", "#FFFFFF", "#CC0605"],
    weights: [4, 3, 1, 3, 4],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateRhinelandPalatinate(): TemplateCfg {
  return symbolFlagTemplate([2, 3], "rhineland_palatinate_flag");
}

export function templateSaarland(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "saarland_flag");
}

export function templateSaxony(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 2,
    colors: ["#FFFFFF", "#006B3F"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateSaxonyAnhalt(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "saxony_anhalt_flag");
}

export function templateThuringia(): TemplateCfg {
  return {
    ratio: [3, 5],
    sections: 2,
    colors: ["#FFFFFF", "#E2001A"],
    orientation: "horizontal",
    overlays: [],
  };
}

export function templateJersey(): TemplateCfg {
  return symbolFlagTemplate([3, 5], "jersey_flag");
}

export function templateIsleOfMan(): TemplateCfg {
  return symbolFlagTemplate([1, 2], "isle_of_man_flag");
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
  aland: templateAland,
  guernsey: templateGuernsey,
  faroe_islands: templateFaroeIslands,
  greenland: templateGreenland,
  baden_wurttemberg: templateBadenWurttemberg,
  bremen: templateBremen,
  hesse: templateHesse,
  north_rhine_westphalia: templateNorthRhineWestphalia,
  schleswig_holstein: templateSchleswigHolstein,
  sardinia: templateSardinia,
  corsica: templateCorsica,
  genoa: templateGenoa,
  venice: templateVenice,
  berlin: templateBerlin,
  brandenburg: templateBrandenburg,
  hamburg: templateHamburg,
  lower_saxony: templateLowerSaxony,
  mecklenburg_vorpommern: templateMecklenburgVorpommern,
  rhineland_palatinate: templateRhinelandPalatinate,
  saarland: templateSaarland,
  saxony: templateSaxony,
  saxony_anhalt: templateSaxonyAnhalt,
  thuringia: templateThuringia,
  jersey: templateJersey,
  isle_of_man: templateIsleOfMan,
};

export function stateLevelFlagTemplate(id: string): (() => TemplateCfg) | null {
  return STATE_LEVEL_FACTORIES[id] ?? null;
}
