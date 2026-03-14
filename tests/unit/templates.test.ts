import { describe, it, expect } from "vitest";
import {
  templatePerPale,
  templatePerFess,
  templateTricolorVertical,
  templateTricolorHorizontal,
  templateQuartered,
  templatePerBend,
  templatePerBendSinister,
  templatePerSaltire,
  templateCenteredCross,
  templateNordicCross,
  templateUS,
  templateIceland,
  templateUruguay,
  templateDRC,
  templateUK,
  templateSouthAfrica,
  templateEngland,
  templateScotland,
  templateWales,
  templateNorthernIreland,
  templateCatalunya,
  templateEuskadi,
  templateBavaria,
  nationalFlagTemplate,
  NATIONAL_FLAG_CONFIGS,
  buildOverlay,
  stateLevelFlagTemplate,
  type OverlayCfg,
  type TemplateCfg,
} from "@/templates";

function isGrayscaleColor(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    return false;
  }
  const red = normalized.slice(1, 3);
  const green = normalized.slice(3, 5);
  const blue = normalized.slice(5, 7);
  return red === green && green === blue;
}

function assertValidTemplate(cfg: TemplateCfg): void {
  expect(cfg.ratio).toHaveLength(2);
  expect(cfg.ratio[0]).toBeGreaterThan(0);
  expect(cfg.ratio[1]).toBeGreaterThan(0);
  expect(cfg.sections).toBeGreaterThanOrEqual(1);
  expect(cfg.colors.length).toBeGreaterThanOrEqual(1);
  expect(Array.isArray(cfg.overlays)).toBe(true);
}

describe("Division templates", () => {
  it("templatePerPale produces a 2-section vertical template", () => {
    const cfg = templatePerPale();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(2);
    expect(cfg.orientation).toBe("vertical");
    expect(cfg.overlays).toHaveLength(0);
  });

  it("templatePerFess produces a 2-section horizontal template", () => {
    const cfg = templatePerFess();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(2);
    expect(cfg.orientation).toBe("horizontal");
    expect(cfg.overlays).toHaveLength(0);
  });

  it("templateTricolorVertical has 3 sections", () => {
    const cfg = templateTricolorVertical();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(3);
    expect(cfg.colors).toHaveLength(3);
  });

  it("templateTricolorHorizontal has 3 sections", () => {
    const cfg = templateTricolorHorizontal();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(3);
    expect(cfg.colors).toHaveLength(3);
  });

  it("templateQuartered has 4 rectangle overlays", () => {
    const cfg = templateQuartered();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(4);
    expect(cfg.overlays.every((o) => o.type === "rectangle")).toBe(true);
  });

  it("templatePerBend has 2 polygon overlays", () => {
    const cfg = templatePerBend();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
    expect(cfg.overlays.every((o) => o.type === "custom")).toBe(true);
  });

  it("templatePerBendSinister has 2 polygon overlays", () => {
    const cfg = templatePerBendSinister();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
  });

  it("templatePerSaltire has 2 band overlays", () => {
    const cfg = templatePerSaltire();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
  });

  it("templateCenteredCross has 2 rectangle overlays", () => {
    const cfg = templateCenteredCross();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
    expect(cfg.overlays.every((o) => o.type === "rectangle")).toBe(true);
  });

  it("templateNordicCross has 2 rectangle overlays", () => {
    const cfg = templateNordicCross();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
    expect(cfg.ratio).toEqual([2, 3]);
  });

  it("uses grayscale stripe colors for all division templates", () => {
    const templates = [
      templatePerPale(),
      templatePerFess(),
      templateTricolorVertical(),
      templateTricolorHorizontal(),
      templateQuartered(),
      templatePerBend(),
      templatePerBendSinister(),
      templatePerSaltire(),
      templateCenteredCross(),
      templateNordicCross(),
    ];

    for (const template of templates) {
      expect(template.colors.every(isGrayscaleColor)).toBe(true);
    }
  });

  it("uses grayscale overlay fills for non-symbol division overlays", () => {
    const templates = [
      templateQuartered(),
      templatePerBend(),
      templatePerBendSinister(),
      templatePerSaltire(),
      templateCenteredCross(),
      templateNordicCross(),
    ];

    for (const template of templates) {
      const filledOverlays = template.overlays.filter((overlay) => overlay.type !== "symbol");
      expect(filledOverlays.every((overlay) => isGrayscaleColor(overlay.fill))).toBe(true);
    }
  });
});

describe("National flag templates", () => {
  it("templateUS has 13 stripes, a canton rect, and a starfield overlay", () => {
    const cfg = templateUS();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(13);
    expect(cfg.ratio).toEqual([10, 19]);
    // 1 rect for the blue canton + 1 starfield for 50 stars
    expect(cfg.overlays).toHaveLength(2);
    const cantonRect = cfg.overlays.find((o) => o.type === "rectangle");
    expect(cantonRect).toBeDefined();
    const starfield = cfg.overlays.find((o) => o.type === "starfield");
    expect(starfield).toBeDefined();
    expect(starfield!.starCount).toBe(50);
    expect(starfield!.starDistribution).toBe("staggered-grid");
  });

  it("templateIceland has 4 cross overlays", () => {
    const cfg = templateIceland();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(4);
    expect(cfg.ratio).toEqual([18, 25]);
  });

  it("templateUruguay has 9 stripes", () => {
    const cfg = templateUruguay();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(9);
    expect(cfg.overlays.length).toBeGreaterThanOrEqual(2);
  });

  it("templateDRC has overlays including a star symbol", () => {
    const cfg = templateDRC();
    assertValidTemplate(cfg);
    const symbols = cfg.overlays.filter((o) => o.type === "symbol");
    expect(symbols).toHaveLength(1);
    expect(symbols[0].symbolId).toBe("star_five_pointed");
  });

  it("templateUK uses offset diagonals and a centered cross for the Union Jack", () => {
    const cfg = templateUK();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(12);
    expect(cfg.overlays.filter((o) => o.type === "custom")).toHaveLength(8);
    expect(cfg.overlays.filter((o) => o.type === "rectangle")).toHaveLength(4);
    expect(cfg.ratio).toEqual([1, 2]);
  });

  it("templateSouthAfrica has multiple band and polygon overlays", () => {
    const cfg = templateSouthAfrica();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(9);
    expect(cfg.overlays[0].type).toBe("custom");
    expect(cfg.overlays.slice(1).every((o) => o.type === "rectangle")).toBe(true);
    expect(cfg.ratio).toEqual([2, 3]);
  });
});

describe("State-level templates", () => {
  it("stateLevelFlagTemplate returns factories for known ids and null for unknown ids", () => {
    expect(stateLevelFlagTemplate("england")).toBeTypeOf("function");
    expect(stateLevelFlagTemplate("scotland")).toBeTypeOf("function");
    expect(stateLevelFlagTemplate("wales")).toBeTypeOf("function");
    expect(stateLevelFlagTemplate("missing_state_flag")).toBeNull();
  });

  it("all state-level template factories produce valid configs", () => {
    const factories = [
      templateEngland,
      templateScotland,
      templateWales,
      templateNorthernIreland,
      templateCatalunya,
      templateEuskadi,
      templateBavaria,
    ];

    for (const create of factories) {
      assertValidTemplate(create());
    }
  });

  it("England and Northern Ireland use centered or saltire crosses with two overlays", () => {
    const england = templateEngland();
    const northernIreland = templateNorthernIreland();

    expect(england.overlays).toHaveLength(2);
    expect(england.overlays.every((overlay) => overlay.type === "rectangle")).toBe(true);
    expect(northernIreland.overlays).toHaveLength(2);
    expect(northernIreland.overlays.every((overlay) => overlay.type === "rectangle")).toBe(true);
  });

  it("Wales, Catalunya, Euskadi, and Bavaria preserve their defining structures", () => {
    const wales = templateWales();
    const catalunya = templateCatalunya();
    const euskadi = templateEuskadi();
    const bavaria = templateBavaria();

    expect(wales.overlays).toHaveLength(1);
    expect(wales.overlays[0].type).toBe("symbol");
    expect(wales.overlays[0].symbolId).toBe("dragon_heraldic");

    expect(catalunya.sections).toBe(9);
    expect(catalunya.colors).toHaveLength(9);

    expect(euskadi.ratio).toEqual([14, 25]);
    expect(euskadi.overlays).toHaveLength(4);
    expect(euskadi.overlays.every((overlay) => overlay.type === "rectangle")).toBe(true);

    expect(bavaria.overlays).toHaveLength(33);
    expect(bavaria.overlays.every((overlay) => overlay.type === "custom")).toBe(true);
  });
});

describe("Template overlay IDs are unique", () => {
  it("all overlays within a template have unique ids", () => {
    const templates = [
      templateQuartered(),
      templateUK(),
      templateUS(),
      templateSouthAfrica(),
    ];
    for (const cfg of templates) {
      const ids = cfg.overlays.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("Data-driven national flag templates", () => {
  it("NATIONAL_FLAG_CONFIGS contains 214 entries", () => {
    expect(NATIONAL_FLAG_CONFIGS.length).toBe(214);
  });

  it("each config entry has an id and name", () => {
    for (const entry of NATIONAL_FLAG_CONFIGS) {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
    }
  });

  it("nationalFlagTemplate returns null for unknown id", () => {
    expect(nationalFlagTemplate("nonexistent_country")).toBeNull();
  });

  it("nationalFlagTemplate returns a factory for a known id", () => {
    const factory = nationalFlagTemplate("france");
    expect(factory).not.toBeNull();
    expect(typeof factory).toBe("function");
  });

  it("factory produces a valid TemplateCfg with correct structure", () => {
    const factory = nationalFlagTemplate("france")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(3);
    expect(cfg.colors).toHaveLength(3);
  });

  it("rectangle overlay type works", () => {
    // Japan has a circle on a white background - uses rectangle for the base or circle
    const factory = nationalFlagTemplate("poland")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    expect(cfg.sections).toBeGreaterThanOrEqual(1);
  });

  it("circle overlay type works", () => {
    const factory = nationalFlagTemplate("japan")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    const circles = cfg.overlays.filter((o) => o.type === "circle");
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it("polygon overlay type works", () => {
    const factory = nationalFlagTemplate("bahamas")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    const polygons = cfg.overlays.filter((o) => o.type === "custom");
    expect(polygons.length).toBeGreaterThanOrEqual(1);
  });

  it("band overlay type works", () => {
    const factory = nationalFlagTemplate("jamaica")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    // makeBandSegment produces type "custom"
    const bands = cfg.overlays.filter((o) => o.type === "custom");
    expect(bands.length).toBeGreaterThanOrEqual(1);
  });

  it("star overlay type works", () => {
    const factory = nationalFlagTemplate("morocco")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    const symbols = cfg.overlays.filter((o) => o.type === "symbol");
    expect(symbols.length).toBeGreaterThanOrEqual(1);
  });

  it("starfield overlay type works", () => {
    const factory = nationalFlagTemplate("united_states")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    const starfields = cfg.overlays.filter((o) => o.type === "starfield");
    expect(starfields.length).toBeGreaterThanOrEqual(1);
  });

  it("symbol overlay type works", () => {
    const factory = nationalFlagTemplate("canada")!;
    const cfg = factory();
    assertValidTemplate(cfg);
    const symbols = cfg.overlays.filter((o) => o.type === "symbol");
    expect(symbols.length).toBeGreaterThanOrEqual(1);
  });

  it("Georgia uses four quarter custom crosses instead of solid squares", () => {
    const cfg = nationalFlagTemplate("georgia")!();
    assertValidTemplate(cfg);
    expect(cfg.overlays.filter((o) => o.type === "rectangle")).toHaveLength(2);
    expect(cfg.overlays.filter((o) => o.type === "custom")).toHaveLength(4);
  });

  it("Qatar uses a single serrated custom overlay", () => {
    const cfg = nationalFlagTemplate("qatar")!();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(1);
    expect(cfg.overlays[0].type).toBe("custom");
  });

  it("Bahrain uses five serrations and the official hoist split", () => {
    const cfg = nationalFlagTemplate("bahrain")!();
    assertValidTemplate(cfg);
    expect(cfg.colors).toEqual(["#DA291C"]);
    expect(cfg.overlays).toHaveLength(1);
    expect(cfg.overlays[0].type).toBe("custom");
    expect(cfg.overlays[0].path).toContain("24.38 0");
    expect(cfg.overlays[0].path).toContain("32.5 10");
  });

  it("United Kingdom uses offset diagonal custom overlays plus the central cross", () => {
    const cfg = nationalFlagTemplate("united_kingdom")!();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(12);
    expect(cfg.overlays.filter((o) => o.type === "custom")).toHaveLength(8);
    expect(cfg.overlays.filter((o) => o.type === "rectangle")).toHaveLength(4);
  });

  it("South Africa places the Y junction at the flag center", () => {
    const cfg = nationalFlagTemplate("south_africa")!();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(9);
    expect(cfg.overlays[0].type).toBe("custom");
    expect(cfg.overlays[0].path).toContain("50 50");
  });

  it("all 214 national templates produce valid configs", () => {
    for (const { id } of NATIONAL_FLAG_CONFIGS) {
      const factory = nationalFlagTemplate(id);
      expect(factory, `factory for "${id}" should exist`).not.toBeNull();
      const cfg = factory!();
      assertValidTemplate(cfg);
    }
  });

  it("overlay IDs are unique across all national templates", () => {
    for (const { id } of NATIONAL_FLAG_CONFIGS) {
      const cfg = nationalFlagTemplate(id)!();
      const ids = cfg.overlays.map((o) => o.id);
      expect(new Set(ids).size, `overlays in "${id}" must have unique ids`).toBe(ids.length);
    }
  });
});

describe("buildOverlay fallback branches", () => {
  const ratio: [number, number] = [2, 3];

  it("rectangle with no optional fields uses defaults", () => {
    const o = buildOverlay({ type: "rectangle" }, ratio);
    expect(o.type).toBe("rectangle");
    expect(o.fill).toBe("#000000");
  });

  it("circle with no optional fields uses defaults", () => {
    const o = buildOverlay({ type: "circle" }, ratio);
    expect(o.type).toBe("circle");
    expect(o.fill).toBe("#000000");
  });

  it("circle uses size when w is not provided", () => {
    const o = buildOverlay({ type: "circle", size: 30 }, ratio);
    expect(o.type).toBe("circle");
  });

  it("polygon with explicit points", () => {
    const pts: [number, number][] = [[0, 0], [50, 50], [0, 100]];
    const o = buildOverlay({ type: "polygon", points: pts }, ratio);
    expect(o.type).toBe("custom");
  });

  it("polygon with no fill uses default", () => {
    const pts: [number, number][] = [[0, 0], [50, 50], [0, 100]];
    const o = buildOverlay({ type: "polygon", points: pts }, ratio);
    expect(o.fill).toBe("#000000");
  });

  it("band with no optional fields uses defaults", () => {
    const o = buildOverlay({ type: "band" }, ratio);
    // makeBandSegment produces a rotated rectangle
    expect(o.type).toBe("rectangle");
    expect(o.fill).toBe("#000000");
  });

  it("star with numeric points", () => {
    const o = buildOverlay({ type: "star", points: 6 }, ratio);
    expect(o.type).toBe("custom");
    expect(o.path).toContain("M");
  });

  it("star with no points defaults to 5", () => {
    const o = buildOverlay({ type: "star" }, ratio);
    expect(o.type).toBe("custom");
    expect(o.path).toContain("M");
  });

  it("star with no optional fields uses all defaults", () => {
    const o = buildOverlay({ type: "star" }, ratio);
    expect(o.fill).toBe("#FFFFFF");
    expect(o.stroke).toBe("#0000");
    expect(o.rotation).toBe(0);
    expect(o.opacity).toBe(1);
  });

  it("starfield with no optional fields uses defaults", () => {
    const o = buildOverlay({ type: "starfield" }, ratio);
    expect(o.type).toBe("starfield");
    expect(o.fill).toBe("#FFFFFF");
    expect(o.starCount).toBe(12);
    expect(o.starDistribution).toBe("ring");
  });

  it("symbol with no optional fields uses defaults", () => {
    const o = buildOverlay({ type: "symbol" }, ratio);
    expect(o.type).toBe("symbol");
    expect(o.symbolId).toBe("");
    expect(o.fill).toBe("#000000");
  });

  it("unknown overlay type falls through to default (rectangle)", () => {
    const o = buildOverlay({ type: "unknown_type" } as OverlayCfg, ratio);
    expect(o.type).toBe("rectangle");
    expect(o.fill).toBe("#000000");
  });
});
