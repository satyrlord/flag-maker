import { describe, it, expect } from "vitest";
import {
  GRID_SIZES,
  DEFAULT_GRID_SIZE,
  GRID_COLOR_CYAN,
  GRID_COLOR_MAGENTA,
  averageLuminance,
  pickGridColor,
  createGridSvg,
} from "@/ui/gridOverlay";

describe("GRID_SIZES", () => {
  it("contains 6 grid sizes", () => {
    expect(GRID_SIZES.length).toBe(6);
  });

  it("has expected labels", () => {
    const labels = GRID_SIZES.map((s) => s.label);
    expect(labels).toEqual(["2x2", "5x5", "10x10", "20x20", "50x50", "100x100"]);
  });

  it("has correct width/height values", () => {
    expect(GRID_SIZES[0]).toEqual({ label: "2x2", width: 2, height: 2 });
    expect(GRID_SIZES[2]).toEqual({ label: "10x10", width: 10, height: 10 });
    expect(GRID_SIZES[5]).toEqual({ label: "100x100", width: 100, height: 100 });
  });
});

describe("DEFAULT_GRID_SIZE", () => {
  it("is 5x5", () => {
    expect(DEFAULT_GRID_SIZE).toBe("5x5");
  });
});

describe("grid color constants", () => {
  it("GRID_COLOR_CYAN is #00ffff", () => {
    expect(GRID_COLOR_CYAN).toBe("#00ffff");
  });

  it("GRID_COLOR_MAGENTA is #ff00ff", () => {
    expect(GRID_COLOR_MAGENTA).toBe("#ff00ff");
  });
});

describe("averageLuminance", () => {
  it("returns 0 for empty array", () => {
    expect(averageLuminance([])).toBe(0);
  });

  it("returns 0 for pure black", () => {
    expect(averageLuminance(["#000000"])).toBe(0);
  });

  it("returns 1 for pure white", () => {
    expect(averageLuminance(["#ffffff"])).toBeCloseTo(1, 2);
  });

  it("returns average for multiple colors", () => {
    const lum = averageLuminance(["#000000", "#ffffff"]);
    expect(lum).toBeCloseTo(0.5, 2);
  });

  it("weights green channel more heavily (BT.709)", () => {
    const lumR = averageLuminance(["#ff0000"]);
    const lumG = averageLuminance(["#00ff00"]);
    const lumB = averageLuminance(["#0000ff"]);
    expect(lumG).toBeGreaterThan(lumR);
    expect(lumG).toBeGreaterThan(lumB);
    expect(lumR).toBeGreaterThan(lumB);
  });
});

describe("pickGridColor", () => {
  it("returns cyan for dark backgrounds", () => {
    expect(pickGridColor(["#000000"])).toBe("#00ffff");
    expect(pickGridColor(["#222222", "#333333"])).toBe("#00ffff");
  });

  it("returns magenta for light backgrounds", () => {
    expect(pickGridColor(["#ffffff"])).toBe("#ff00ff");
    expect(pickGridColor(["#dddddd", "#eeeeee"])).toBe("#ff00ff");
  });
});

describe("createGridSvg", () => {
  it("returns an SVGSVGElement", () => {
    const svg = createGridSvg(1200, 800, 5, 5, "#00ffff");
    expect(svg.tagName.toLowerCase()).toBe("svg");
  });

  it("sets correct viewBox", () => {
    const svg = createGridSvg(1200, 800, 5, 5, "#00ffff");
    expect(svg.getAttribute("viewBox")).toBe("0 0 1200 800");
  });

  it("has grid-overlay class", () => {
    const svg = createGridSvg(1200, 800, 5, 5, "#00ffff");
    expect(svg.classList.contains("grid-overlay")).toBe(true);
  });

  it("contains a pattern with the specified cell dimensions", () => {
    const svg = createGridSvg(1200, 800, 10, 10, "#ff00ff");
    const pattern = svg.querySelector("pattern");
    expect(pattern).not.toBeNull();
    expect(pattern!.getAttribute("width")).toBe("10");
    expect(pattern!.getAttribute("height")).toBe("10");
  });

  it("pattern contains lines with the specified color", () => {
    const svg = createGridSvg(1200, 800, 5, 5, "#ff00ff");
    const lines = svg.querySelectorAll("pattern line");
    expect(lines.length).toBe(2);
    expect(lines[0].getAttribute("stroke")).toBe("#ff00ff");
    expect(lines[1].getAttribute("stroke")).toBe("#ff00ff");
  });

  it("has a rect that fills the entire area with the pattern", () => {
    const svg = createGridSvg(1200, 800, 5, 5, "#00ffff");
    const rect = svg.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute("width")).toBe("1200");
    expect(rect!.getAttribute("height")).toBe("800");
    expect(rect!.getAttribute("fill")).toBe("url(#grid-pattern)");
  });
});
