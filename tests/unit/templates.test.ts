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
  templatePerChevron,
  templateCenteredCross,
  templateNordicCross,
  templateUS,
  templateIceland,
  templateUruguay,
  templateDRC,
  templateUK,
  templateSouthAfrica,
  type TemplateCfg,
} from "@/templates";
import { VIEW_W, computeViewH } from "@/geometry";

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

  it("templatePerChevron has 2 band overlays", () => {
    const cfg = templatePerChevron();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
  });

  it("templateCenteredCross has 2 rectangle overlays", () => {
    const cfg = templateCenteredCross();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(2);
    expect(cfg.overlays.every((o) => o.type === "rectangle")).toBe(true);
  });

  it("templateNordicCross has 4 rectangle overlays", () => {
    const cfg = templateNordicCross();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(4);
    expect(cfg.ratio).toEqual([18, 25]);
  });
});

describe("National flag templates", () => {
  it("templateUS has 13 stripes and 50 stars + 1 canton", () => {
    const viewH = computeViewH([10, 19]);
    const cfg = templateUS(VIEW_W, viewH);
    assertValidTemplate(cfg);
    expect(cfg.sections).toBe(13);
    expect(cfg.ratio).toEqual([10, 19]);
    // 1 canton rectangle + 50 stars
    expect(cfg.overlays).toHaveLength(51);
    const stars = cfg.overlays.filter((o) => o.type === "star");
    expect(stars).toHaveLength(50);
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

  it("templateDRC has overlays including a star", () => {
    const cfg = templateDRC();
    assertValidTemplate(cfg);
    const stars = cfg.overlays.filter((o) => o.type === "star");
    expect(stars).toHaveLength(1);
  });

  it("templateUK has 8 overlays for the Union Jack", () => {
    const cfg = templateUK();
    assertValidTemplate(cfg);
    expect(cfg.overlays).toHaveLength(8);
    expect(cfg.ratio).toEqual([1, 2]);
  });

  it("templateSouthAfrica has multiple band and polygon overlays", () => {
    const cfg = templateSouthAfrica();
    assertValidTemplate(cfg);
    expect(cfg.overlays.length).toBeGreaterThanOrEqual(8);
    expect(cfg.ratio).toEqual([2, 3]);
  });
});

describe("Template overlay IDs are unique", () => {
  it("all overlays within a template have unique ids", () => {
    const templates = [
      templateQuartered(),
      templateUK(),
      templateUS(VIEW_W, computeViewH([10, 19])),
      templateSouthAfrica(),
    ];
    for (const cfg of templates) {
      const ids = cfg.overlays.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
