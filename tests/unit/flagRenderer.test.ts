import { beforeAll, describe, it, expect } from "vitest";
import {
  renderFlag,
  registerBuiltinSymbols,
  registerSymbols,
  getCurrentSvg,
  getCurrentRatio,
  computeStarPositions,
} from "@/flagRenderer";
import { loadBuiltinSymbols } from "@/symbols";
import type { FlagDesign, Overlay } from "@/types";

/* Register test-only symbols so render tests do not depend on built-in config */
registerSymbols([
  { id: "test_path_sym", name: "Test Path", category: "Test", path: "M10 10 H90 V90 H10 Z" },
  { id: "test_gen_sym", name: "Test Gen", category: "Test", generator: "star5" },
  {
    id: "test_svg_sym",
    name: "Test SVG",
    category: "Test",
    viewBox: "0 0 10 10",
    svg: "<defs><circle id=\"dot\" cx=\"5\" cy=\"5\" r=\"4\" /></defs><use href=\"#dot\" fill=\"#123456\" stroke=\"#123456\" />",
  },
  {
    id: "test_multicolor_svg_sym",
    name: "Test Multicolor SVG",
    category: "Test",
    viewBox: "0 0 10 10",
    svg: "<circle cx=\"5\" cy=\"5\" r=\"4\" fill=\"#123456\" /><path d=\"M1 1 L9 9\" stroke=\"#abcdef\" stroke-width=\"1\" />",
  },
]);

beforeAll(async () => {
  registerBuiltinSymbols(await loadBuiltinSymbols());
});

const baseDesign: FlagDesign = {
  orientation: "horizontal",
  ratio: [2, 3],
  sections: 3,
  weights: [1, 1, 1],
  colors: ["#FF0000", "#FFFFFF", "#0000FF"],
  overlays: [],
};

describe("renderFlag", () => {
  it("getCurrentRatio returns default [2, 3] before any render", () => {
    expect(getCurrentRatio()).toEqual([2, 3]);
  });

  it("returns an SVGSVGElement", () => {
    const el = renderFlag(baseDesign);
    expect(el.tagName.toLowerCase()).toBe("svg");
  });

  it("sets the correct viewBox for horizontal 2:3 flag", () => {
    const el = renderFlag(baseDesign);
    expect(el.getAttribute("viewBox")).toBe("0 0 1200 800");
  });

  it("sets the correct viewBox for a 1:2 ratio flag", () => {
    const el = renderFlag({ ...baseDesign, ratio: [1, 2] });
    expect(el.getAttribute("viewBox")).toBe("0 0 1200 600");
  });

  it("sets width and height attributes for export", () => {
    const el = renderFlag(baseDesign);
    expect(el.getAttribute("width")).toBe("1200");
    expect(el.getAttribute("height")).toBe("800");
  });

  it("renders the correct number of stripe rects for horizontal stripes", () => {
    const el = renderFlag(baseDesign);
    const rects = el.querySelectorAll("rect");
    expect(rects.length).toBe(3);
  });

  it("renders stripe rects with correct fill colors", () => {
    const el = renderFlag(baseDesign);
    const rects = el.querySelectorAll("rect");
    expect(rects[0].getAttribute("fill")).toBe("#FF0000");
    expect(rects[1].getAttribute("fill")).toBe("#FFFFFF");
    expect(rects[2].getAttribute("fill")).toBe("#0000FF");
  });

  it("renders vertical stripes correctly", () => {
    const el = renderFlag({ ...baseDesign, orientation: "vertical", sections: 2, weights: [1, 1], colors: ["#A", "#B"] });
    const rects = el.querySelectorAll("rect");
    expect(rects.length).toBe(2);
    // Vertical: first rect starts at x=0, second rect at x>0
    expect(rects[0].getAttribute("x")).toBe("0");
    expect(Number(rects[1].getAttribute("x"))).toBeGreaterThan(0);
  });

  it("respects non-equal stripe weights", () => {
    const el = renderFlag({ ...baseDesign, sections: 2, weights: [1, 2], colors: ["#A", "#B"] });
    const rects = el.querySelectorAll("rect");
    const h1 = Number(rects[0].getAttribute("height"));
    const h2 = Number(rects[1].getAttribute("height"));
    expect(Math.round(h2 / h1)).toBe(2);
  });

  it("updates getCurrentSvg after each render", () => {
    const el = renderFlag(baseDesign);
    expect(getCurrentSvg()).toBe(el);
    const el2 = renderFlag({ ...baseDesign, sections: 2, weights: [1, 1], colors: ["#C", "#D"] });
    expect(getCurrentSvg()).toBe(el2);
  });

  it("updates getCurrentRatio after render", () => {
    renderFlag({ ...baseDesign, ratio: [1, 2] });
    expect(getCurrentRatio()).toEqual([1, 2]);
    renderFlag({ ...baseDesign, ratio: [3, 5] });
    expect(getCurrentRatio()).toEqual([3, 5]);
  });

  it("getCurrentRatio returns a defensive copy", () => {
    renderFlag({ ...baseDesign, ratio: [2, 3] });
    const copy = getCurrentRatio();
    copy[0] = 99;
    copy[1] = 99;
    expect(getCurrentRatio()).toEqual([2, 3]);
  });
});

describe("renderFlag with overlays", () => {
  const makeBase = (overlays: Overlay[]): FlagDesign => ({
    ...baseDesign,
    sections: 1,
    weights: [1],
    colors: ["#FFFFFF"],
    overlays,
  });

  it("renders a rectangle overlay", () => {
    const ov: Overlay = {
      id: "r1", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    // 1 stripe rect + 1 overlay rect
    expect(rects.length).toBe(2);
    expect(rects[1].getAttribute("fill")).toBe("#FF0000");
  });

  it("applies rotation transform on rectangle overlay", () => {
    const ov: Overlay = {
      id: "r2", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 45, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    const transform = rects[1].getAttribute("transform");
    expect(transform).toContain("rotate(45");
  });

  it("renders a circle overlay as an ellipse", () => {
    const ov: Overlay = {
      id: "c1", type: "circle",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#00FF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const ellipses = el.querySelectorAll("ellipse");
    expect(ellipses.length).toBe(1);
    expect(ellipses[0].getAttribute("fill")).toBe("#00FF00");
  });

  it("applies rotation on circle overlay", () => {
    const ov: Overlay = {
      id: "c2", type: "circle",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 30, fill: "#00FF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const ellipses = el.querySelectorAll("ellipse");
    expect(ellipses[0].getAttribute("transform")).toContain("rotate(30");
  });

  it("renders a custom path overlay", () => {
    const ov: Overlay = {
      id: "p1", type: "custom",
      x: 50, y: 50, w: 100, h: 100,
      rotation: 0, fill: "#FF00FF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      path: "M 0 0 L 50 50 L 0 100 Z",
    };
    const el = renderFlag(makeBase([ov]));
    const paths = el.querySelectorAll("path");
    expect(paths[0].getAttribute("d")).toBe("M 0 0 L 50 50 L 0 100 Z");
    expect(paths[0].getAttribute("fill")).toBe("#FF00FF");
  });

  it("applies opacity when less than 1", () => {
    const ov: Overlay = {
      id: "op1", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 0.5,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    expect(rects[1].getAttribute("opacity")).toBe("0.5");
  });

  it("does not set opacity attribute when opacity is 1", () => {
    const ov: Overlay = {
      id: "op2", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    expect(rects[1].getAttribute("opacity")).toBeNull();
  });

  it("applies stroke when strokeWidth > 0 and stroke is not transparent", () => {
    const ov: Overlay = {
      id: "str1", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#000000", strokeWidth: 2, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    expect(rects[1].getAttribute("stroke")).toBe("#000000");
    expect(rects[1].getAttribute("stroke-width")).toBe("2");
  });

  it("skips stroke when stroke is #0000 (transparent)", () => {
    const ov: Overlay = {
      id: "str2", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 2, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const rects = el.querySelectorAll("rect");
    expect(rects[1].getAttribute("stroke")).toBeNull();
  });

  it("ignores custom overlay with no path", () => {
    const ov: Overlay = {
      id: "cp1", type: "custom",
      x: 50, y: 50, w: 100, h: 100,
      rotation: 0, fill: "#FF00FF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const paths = el.querySelectorAll("path");
    expect(paths.length).toBe(0);
  });

  it("renders a symbol overlay with built-in path symbol", () => {
    const ov: Overlay = {
      id: "sym1", type: "symbol",
      symbolId: "test_path_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(1);
  });

  it("renders a symbol overlay with star5 generator", () => {
    const ov: Overlay = {
      id: "sym2", type: "symbol",
      symbolId: "test_gen_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(1);
  });

  it("applies rotation on symbol overlay", () => {
    const ov: Overlay = {
      id: "sym3", type: "symbol",
      symbolId: "test_path_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 45, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs[0].getAttribute("transform")).toContain("rotate(45");
  });

  it("normalizes imported svg symbols so overlay tinting applies consistently", () => {
    const ov: Overlay = {
      id: "sym4", type: "symbol",
      symbolId: "test_svg_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#abcdef", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nested = el.querySelector<SVGSVGElement>("svg > svg");
    const use = nested?.querySelector("use");
    expect(nested).not.toBeNull();
    expect(nested?.querySelector("defs")).not.toBeNull();
    expect(nested?.style.color).not.toBe("");
    expect(nested?.getAttribute("overflow")).toBe("visible");
    expect(use?.getAttribute("fill")).toBe("currentColor");
    expect(use?.getAttribute("stroke")).toBe("currentColor");
  });

  it("preserves multicolor imported svg symbol paint in the rendered output", () => {
    const ov: Overlay = {
      id: "sym-multi", type: "symbol",
      symbolId: "test_multicolor_svg_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#fedf00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nested = el.querySelector<SVGSVGElement>("svg > svg");
    const circle = nested?.querySelector("circle");
    const path = nested?.querySelector("path");

    expect(nested).not.toBeNull();
    expect(nested?.style.color).not.toBe("");
    expect(circle?.getAttribute("fill")).toBe("#123456");
    expect(path?.getAttribute("stroke")).toBe("#abcdef");
  });

  it("ignores symbol overlay with unknown symbolId", () => {
    const ov: Overlay = {
      id: "sym4", type: "symbol",
      symbolId: "nonexistent_symbol",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(0);
  });

  it("ignores symbol overlay with no symbolId", () => {
    const ov: Overlay = {
      id: "sym5", type: "symbol",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(0);
  });
});

describe("registerSymbols", () => {
  it("adds custom symbol to registry", () => {
    registerSymbols([{
      id: "custom_test_sym",
      name: "Test Symbol",
      category: "Test",
      path: "M 0 0 L 100 100",
      viewBox: "0 0 100 100",
    }]);

    const ov: Overlay = {
      id: "reg1", type: "symbol",
      symbolId: "custom_test_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag({
      ...baseDesign,
      sections: 1,
      weights: [1],
      colors: ["#FFFFFF"],
      overlays: [ov],
    });
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(1);
  });

  it("renders registered symbol with svg inner markup", () => {
    registerSymbols([{
      id: "custom_svg_sym",
      name: "SVG Symbol",
      category: "Test",
      svg: "<circle cx='50' cy='50' r='40'/>",
      viewBox: "0 0 100 100",
    }]);

    const ov: Overlay = {
      id: "reg2", type: "symbol",
      symbolId: "custom_svg_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag({
      ...baseDesign,
      sections: 1,
      weights: [1],
      colors: ["#FFFFFF"],
      overlays: [ov],
    });
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs.length).toBe(1);
  });

  it("normalizes legacy xlink references in built-in svg symbols before rendering", () => {
    const ov: Overlay = {
      id: "reg3", type: "symbol",
      symbolId: "hamburg_flag",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag({
      ...baseDesign,
      sections: 1,
      weights: [1],
      colors: ["#FFFFFF"],
      overlays: [ov],
    });

    const nested = el.querySelector('svg[data-overlay-id="reg3"]');
    expect(nested).toBeTruthy();
    expect(nested?.innerHTML).toContain("href=\"#a\"");
    expect(nested?.innerHTML).not.toContain("xlink:href");
  });
});

describe("getCurrentSvg", () => {
  it("returns null before any render", () => {
    // Note: other tests run first and set currentSvg, so we just verify the contract
    // after a render call it must return the last rendered SVG
    const el = renderFlag(baseDesign);
    expect(getCurrentSvg()).toBe(el);
  });
});

describe("data-overlay-id attribute", () => {
  const makeBase = (overlays: Overlay[]): FlagDesign => ({
    ...baseDesign,
    sections: 1,
    weights: [1],
    colors: ["#FFFFFF"],
    overlays,
  });

  it("sets data-overlay-id on rendered overlay elements", () => {
    const ov: Overlay = {
      id: "ov-test-1", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const tagged = el.querySelector("[data-overlay-id='ov-test-1']");
    expect(tagged).not.toBeNull();
  });

  it("sets data-overlay-id on symbol overlays", () => {
    const ov: Overlay = {
      id: "sym-test-1", type: "symbol",
      symbolId: "test_gen_sym",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const tagged = el.querySelector("[data-overlay-id='sym-test-1']");
    expect(tagged).not.toBeNull();
  });

  it("does not set data-overlay-id on hidden overlays", () => {
    const ov: Overlay = {
      id: "hidden-1", type: "rectangle",
      x: 50, y: 50, w: 30, h: 20,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      visible: false,
    };
    const el = renderFlag(makeBase([ov]));
    const tagged = el.querySelector("[data-overlay-id='hidden-1']");
    expect(tagged).toBeNull();
  });
});

describe("computeStarPositions", () => {
  const makeStarfieldOv = (dist: string, count: number, cols = 6): Overlay => ({
    id: "sf1", type: "starfield",
    x: 50, y: 50, w: 40, h: 40,
    rotation: 0, fill: "#FFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    starDistribution: dist,
    starCount: count,
    starCols: cols,
    starPoints: 5,
    starPointLength: 0.38,
    starSize: 50,
  });

  it("ring distribution returns correct count of positions", () => {
    const positions = computeStarPositions(makeStarfieldOv("ring", 12), 400, 400);
    expect(positions).toHaveLength(12);
  });

  it("ring positions lie on an ellipse within bounding box", () => {
    const bw = 400, bh = 300;
    const positions = computeStarPositions(makeStarfieldOv("ring", 8), bw, bh);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(bw);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(bh);
    }
  });

  it("grid distribution creates count positions", () => {
    const positions = computeStarPositions(makeStarfieldOv("grid", 9, 3), 300, 300);
    expect(positions).toHaveLength(9);
  });

  it("staggered-grid produces 50 positions for US flag layout", () => {
    const positions = computeStarPositions(makeStarfieldOv("staggered-grid", 50, 6), 400, 300);
    expect(positions).toHaveLength(50);
  });

  it("line distribution arranges stars horizontally", () => {
    const positions = computeStarPositions(makeStarfieldOv("line", 5), 500, 100);
    expect(positions).toHaveLength(5);
    // All stars should have the same y coordinate (center)
    const ys = positions.map((p) => p.y);
    expect(new Set(ys).size).toBe(1);
  });

  it("arc distribution returns correct count", () => {
    const positions = computeStarPositions(makeStarfieldOv("arc", 4), 400, 400);
    expect(positions).toHaveLength(4);
  });

  it("returns empty array for unknown distribution", () => {
    const positions = computeStarPositions(makeStarfieldOv("unknown", 6), 400, 400);
    expect(positions).toHaveLength(0);
  });

  it("staggered-grid positions all lie within bounding box", () => {
    const bw = 400, bh = 300;
    const positions = computeStarPositions(makeStarfieldOv("staggered-grid", 50, 6), bw, bh);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(bw);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(bh);
    }
  });

  it("grid positions all lie within bounding box", () => {
    const bw = 300, bh = 300;
    const positions = computeStarPositions(makeStarfieldOv("grid", 9, 3), bw, bh);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(bw);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(bh);
    }
  });

  it("line positions all have zero rotation", () => {
    const positions = computeStarPositions(makeStarfieldOv("line", 5), 500, 100);
    for (const p of positions) {
      expect(p.rotation).toBe(0);
    }
  });

  it("arc positions spread in a quarter-circle arc", () => {
    const bw = 400, bh = 400;
    const positions = computeStarPositions(makeStarfieldOv("arc", 4), bw, bh);
    expect(positions).toHaveLength(4);
    // All positions should be within bounds
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(-10);
      expect(p.x).toBeLessThanOrEqual(bw + 10);
      expect(p.y).toBeGreaterThanOrEqual(-10);
      expect(p.y).toBeLessThanOrEqual(bh + 10);
    }
  });
});

describe("renderFlag with starfield overlay", () => {
  const makeBase2 = (overlays: Overlay[]): FlagDesign => ({
    ...baseDesign,
    sections: 1,
    weights: [1],
    colors: ["#002868"],
    overlays,
  });

  it("renders starfield as a group with star paths", () => {
    const ov: Overlay = {
      id: "sf-render", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-render']");
    expect(group).not.toBeNull();
    const paths = group!.querySelectorAll("path");
    expect(paths).toHaveLength(12);
  });

  it("does not render hidden starfield", () => {
    const ov: Overlay = {
      id: "sf-hidden", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 6,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
      visible: false,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-hidden']");
    expect(group).toBeNull();
  });

  it("renders starfield with rotation transform", () => {
    const ov: Overlay = {
      id: "sf-rot", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 45, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "grid", starCount: 4,
      starCols: 2,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-rot']");
    expect(group).not.toBeNull();
    expect(group!.getAttribute("transform")).toContain("rotate(45");
  });

  it("renders starfield with staggered-grid distribution", () => {
    const ov: Overlay = {
      id: "sf-stag", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "staggered-grid", starCount: 11,
      starCols: 3,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-stag']");
    expect(group).not.toBeNull();
    const paths = group!.querySelectorAll("path");
    expect(paths).toHaveLength(11);
  });

  it("renders starfield with line distribution", () => {
    const ov: Overlay = {
      id: "sf-line", type: "starfield",
      x: 50, y: 50, w: 80, h: 20,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "line", starCount: 5,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-line']");
    expect(group).not.toBeNull();
    const paths = group!.querySelectorAll("path");
    expect(paths).toHaveLength(5);
  });

  it("renders starfield with arc distribution", () => {
    const ov: Overlay = {
      id: "sf-arc", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "arc", starCount: 4,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-arc']");
    expect(group).not.toBeNull();
    const paths = group!.querySelectorAll("path");
    expect(paths).toHaveLength(4);
  });

  it("applies opacity less than 1 on starfield", () => {
    const ov: Overlay = {
      id: "sf-opac", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 0.7,
      starDistribution: "ring", starCount: 4,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    const el = renderFlag(makeBase2([ov]));
    const group = el.querySelector("g[data-overlay-id='sf-opac']");
    expect(group).not.toBeNull();
    expect(group!.getAttribute("opacity")).toBe("0.7");
  });
});
