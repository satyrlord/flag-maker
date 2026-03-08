import { describe, it, expect } from "vitest";
import { VIEW_W, computeViewH, computeStripeRects } from "@/geometry";

describe("VIEW_W", () => {
  it("is 1200", () => {
    expect(VIEW_W).toBe(1200);
  });
});

describe("computeViewH", () => {
  it("computes correct height for 2:3 ratio", () => {
    expect(computeViewH([2, 3])).toBe(800);
  });

  it("computes correct height for 1:2 ratio", () => {
    expect(computeViewH([1, 2])).toBe(600);
  });

  it("computes correct height for 1:1 ratio", () => {
    expect(computeViewH([1, 1])).toBe(1200);
  });

  it("computes correct height for 10:19 ratio", () => {
    expect(computeViewH([10, 19])).toBe(Math.round((1200 * 10) / 19));
  });

  it("computes correct height for 18:25 ratio", () => {
    expect(computeViewH([18, 25])).toBe(Math.round((1200 * 18) / 25));
  });
});

describe("computeStripeRects", () => {
  it("creates horizontal stripes with equal weights", () => {
    const rects = computeStripeRects(3, [1, 1, 1], ["red", "white", "blue"], "horizontal", 900);
    expect(rects).toHaveLength(3);
    // Each stripe should be 300px tall
    expect(rects[0]).toEqual({ x: 0, y: 0, w: 1200, h: 300, fill: "red" });
    expect(rects[1]).toEqual({ x: 0, y: 300, w: 1200, h: 300, fill: "white" });
    expect(rects[2]).toEqual({ x: 0, y: 600, w: 1200, h: 300, fill: "blue" });
  });

  it("creates vertical stripes with equal weights", () => {
    const rects = computeStripeRects(2, [1, 1], ["blue", "yellow"], "vertical", 800);
    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({ x: 0, y: 0, w: 600, h: 800, fill: "blue" });
    expect(rects[1]).toEqual({ x: 600, y: 0, w: 600, h: 800, fill: "yellow" });
  });

  it("respects unequal weights", () => {
    const rects = computeStripeRects(2, [2, 1], ["red", "white"], "horizontal", 900);
    expect(rects).toHaveLength(2);
    expect(rects[0].h).toBe(600); // 2/3 of 900
    expect(rects[1].h).toBe(300); // 1/3 of 900
  });

  it("creates a single stripe covering the full area", () => {
    const rects = computeStripeRects(1, [1], ["green"], "horizontal", 800);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ x: 0, y: 0, w: 1200, h: 800, fill: "green" });
  });

  it("stripes tile without gaps", () => {
    const rects = computeStripeRects(5, [1, 1, 1, 1, 1], ["a", "b", "c", "d", "e"], "vertical", 600);
    const totalWidth = rects.reduce((sum, r) => sum + r.w, 0);
    expect(totalWidth).toBe(1200);
  });
});
