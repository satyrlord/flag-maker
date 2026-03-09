import { describe, it, expect } from "vitest";
import { formatRatioDisplay } from "@/ui/leftbar";

describe("formatRatioDisplay", () => {
  const sampleRatio: [number, number] = [2, 3]; // [height, width]

  it("hw mode returns H:W", () => {
    expect(formatRatioDisplay(sampleRatio, "hw")).toBe("2:3");
  });

  it("wh mode returns W:H", () => {
    expect(formatRatioDisplay(sampleRatio, "wh")).toBe("3:2");
  });

  it("decimal mode returns W/H as a decimal string", () => {
    expect(formatRatioDisplay(sampleRatio, "decimal")).toBe("1.5");
  });

  it("hw mode with square ratio returns 1:1", () => {
    expect(formatRatioDisplay([1, 1], "hw")).toBe("1:1");
  });

  it("wh mode with square ratio returns 1:1", () => {
    expect(formatRatioDisplay([1, 1], "wh")).toBe("1:1");
  });

  it("decimal mode with square ratio returns 1", () => {
    expect(formatRatioDisplay([1, 1], "decimal")).toBe("1");
  });

  it("decimal mode strips trailing zeros", () => {
    // 10:19 → 19/10 = 1.9 (no trailing zero)
    expect(formatRatioDisplay([10, 19], "decimal")).toBe("1.9");
  });

  it("decimal mode rounds to at most 2 decimal places", () => {
    // 3:5 → 5/3 ≈ 1.67
    expect(formatRatioDisplay([3, 5], "decimal")).toBe("1.67");
  });

  it("hw mode preserves multi-digit values", () => {
    expect(formatRatioDisplay([11, 28], "hw")).toBe("11:28");
  });

  it("wh mode swaps multi-digit values", () => {
    expect(formatRatioDisplay([11, 28], "wh")).toBe("28:11");
  });

  it("decimal mode returns '\u221e' when height is 0", () => {
    expect(formatRatioDisplay([0, 5], "decimal")).toBe("\u221e");
  });

  it("hw mode with zero height returns '0:5'", () => {
    expect(formatRatioDisplay([0, 5], "hw")).toBe("0:5");
  });

  it("wh mode with zero height returns '5:0'", () => {
    expect(formatRatioDisplay([0, 5], "wh")).toBe("5:0");
  });

  it("decimal mode handles very large ratios without error", () => {
    // 1:10000 → W/H = 10000
    const result = formatRatioDisplay([1, 10000], "decimal");
    expect(result).toBe("10000");
  });
});
