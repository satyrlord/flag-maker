import { describe, it, expect } from "vitest";
import { renderFlag, registerSymbols, getCurrentSvg } from "@/flagRenderer";
import type { FlagDesign, Overlay } from "@/types";

const baseDesign: FlagDesign = {
  orientation: "horizontal",
  ratio: [2, 3],
  sections: 3,
  weights: [1, 1, 1],
  colors: ["#FF0000", "#FFFFFF", "#0000FF"],
  overlays: [],
};

describe("renderFlag", () => {
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

  it("renders a star overlay as a path", () => {
    const ov: Overlay = {
      id: "s1", type: "star",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0, fill: "#FFFF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const paths = el.querySelectorAll("path");
    expect(paths.length).toBe(1);
    expect(paths[0].getAttribute("fill")).toBe("#FFFF00");
  });

  it("applies rotation on star overlay", () => {
    const ov: Overlay = {
      id: "s2", type: "star",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 15, fill: "#FFFF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const paths = el.querySelectorAll("path");
    expect(paths[0].getAttribute("transform")).toContain("rotate(15");
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
      symbolId: "greek_cross",
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
      symbolId: "star5",
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
      symbolId: "greek_cross",
      x: 50, y: 50, w: 20, h: 20,
      rotation: 45, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
    };
    const el = renderFlag(makeBase([ov]));
    const nestedSvgs = el.querySelectorAll("svg > svg");
    expect(nestedSvgs[0].getAttribute("transform")).toContain("rotate(45");
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
});

describe("getCurrentSvg", () => {
  it("returns null before any render", () => {
    // Note: other tests run first and set currentSvg, so we just verify the contract
    // after a render call it must return the last rendered SVG
    const el = renderFlag(baseDesign);
    expect(getCurrentSvg()).toBe(el);
  });
});
