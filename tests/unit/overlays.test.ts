import { describe, it, expect } from "vitest";
import { rectOverlay, circleOverlay, polyOverlay, starOverlay, makeBandSegment } from "@/overlays";

describe("rectOverlay", () => {
  it("creates a rectangle overlay with correct properties", () => {
    const ov = rectOverlay({ xPct: 50, yPct: 50, wPct: 100, hPct: 50, fill: "#FF0000" });
    expect(ov.type).toBe("rectangle");
    expect(ov.x).toBe(50);
    expect(ov.y).toBe(50);
    expect(ov.w).toBe(100);
    expect(ov.h).toBe(50);
    expect(ov.fill).toBe("#FF0000");
    expect(ov.id).toBeTruthy();
  });

  it("applies default values for optional params", () => {
    const ov = rectOverlay({ xPct: 0, yPct: 0, wPct: 10, hPct: 10, fill: "#000" });
    expect(ov.stroke).toBe("#0000");
    expect(ov.strokeWidth).toBe(0);
    expect(ov.rotation).toBe(0);
    expect(ov.opacity).toBe(1);
  });

  it("uses custom optional params when provided", () => {
    const ov = rectOverlay({
      xPct: 25, yPct: 25, wPct: 50, hPct: 50,
      fill: "#FFF", stroke: "#000", strokeWidth: 2, rotation: 45, opacity: 0.5,
    });
    expect(ov.stroke).toBe("#000");
    expect(ov.strokeWidth).toBe(2);
    expect(ov.rotation).toBe(45);
    expect(ov.opacity).toBe(0.5);
  });

  it("generates unique ids", () => {
    const a = rectOverlay({ xPct: 0, yPct: 0, wPct: 10, hPct: 10, fill: "#000" });
    const b = rectOverlay({ xPct: 0, yPct: 0, wPct: 10, hPct: 10, fill: "#000" });
    expect(a.id).not.toBe(b.id);
  });
});

describe("polyOverlay", () => {
  it("creates a custom overlay with a path from points", () => {
    const ov = polyOverlay([[0, 0], [100, 0], [50, 50]], "#00FF00");
    expect(ov.type).toBe("custom");
    expect(ov.path).toBe("M 0 0 L 100 0 L 50 50 Z");
    expect(ov.fill).toBe("#00FF00");
  });

  it("sets centered position and full size", () => {
    const ov = polyOverlay([[10, 20], [30, 40]], "#000");
    expect(ov.x).toBe(50);
    expect(ov.y).toBe(50);
    expect(ov.w).toBe(100);
    expect(ov.h).toBe(100);
  });
});

describe("circleOverlay", () => {
  it("creates a circle overlay with square dimensions", () => {
    const ov = circleOverlay({ xPct: 50, yPct: 50, sizePct: 20, fill: "#00FF00" });
    expect(ov.type).toBe("circle");
    expect(ov.w).toBe(20);
    expect(ov.h).toBe(20);
    expect(ov.fill).toBe("#00FF00");
  });

  it("applies default stroke and opacity", () => {
    const ov = circleOverlay({ xPct: 0, yPct: 0, sizePct: 10, fill: "#FFF" });
    expect(ov.stroke).toBe("#0000");
    expect(ov.opacity).toBe(1);
  });

  it("generates unique ids", () => {
    const a = circleOverlay({ xPct: 0, yPct: 0, sizePct: 10, fill: "#000" });
    const b = circleOverlay({ xPct: 0, yPct: 0, sizePct: 10, fill: "#000" });
    expect(a.id).not.toBe(b.id);
  });
});

describe("starOverlay", () => {
  it("creates a star overlay with square dimensions", () => {
    const ov = starOverlay({ xPct: 50, yPct: 50, sizePct: 20, fill: "#FFD500" });
    expect(ov.type).toBe("star");
    expect(ov.w).toBe(20);
    expect(ov.h).toBe(20);
    expect(ov.fill).toBe("#FFD500");
  });

  it("applies default stroke and opacity", () => {
    const ov = starOverlay({ xPct: 0, yPct: 0, sizePct: 10, fill: "#FFF" });
    expect(ov.stroke).toBe("#0000");
    expect(ov.opacity).toBe(1);
  });
});

describe("makeBandSegment", () => {
  it("creates a rotated rectangle overlay", () => {
    const ov = makeBandSegment(0, 0, 100, 100, 18, "#0038A8", [2, 3]);
    expect(ov.type).toBe("rectangle");
    expect(ov.x).toBe(50);
    expect(ov.y).toBe(50);
    expect(ov.h).toBe(18);
    expect(ov.fill).toBe("#0038A8");
  });

  it("computes non-zero rotation for diagonal bands", () => {
    const ov = makeBandSegment(0, 0, 100, 100, 18, "#000", [2, 3]);
    expect(ov.rotation).not.toBe(0);
  });

  it("computes zero rotation for horizontal bands", () => {
    const ov = makeBandSegment(0, 50, 100, 50, 10, "#000", [1, 2]);
    expect(ov.rotation).toBeCloseTo(0, 5);
  });

  it("has a length greater than the thickness", () => {
    const ov = makeBandSegment(0, 0, 100, 100, 10, "#000", [2, 3]);
    expect(ov.w).toBeGreaterThan(ov.h);
  });
});
