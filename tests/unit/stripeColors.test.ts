import { describe, expect, it } from "vitest";
import { extendStripeColors } from "@/stripeColors";

describe("extendStripeColors", () => {
  it("returns a truncated copy when targetCount is smaller", () => {
    expect(extendStripeColors(["#111111", "#222222", "#333333"], 2, ["#aaaaaa"]))
      .toEqual(["#111111", "#222222"]);
  });

  it("extends colors using the configured palette sequence", () => {
    expect(extendStripeColors(["#111111", "#222222"], 4, ["#aaaaaa", "#bbbbbb", "#cccccc", "#dddddd"]))
      .toEqual(["#111111", "#222222", "#cccccc", "#dddddd"]);
  });

  it("reuses later fallback colors when the palette is shorter than the target count", () => {
    expect(extendStripeColors(["#111111"], 3, ["#aaaaaa"]))
      .toEqual(["#111111", "#aaaaaa", "#aaaaaa"]);
  });

  it("stops extending when neither the palette nor existing colors provide a fallback", () => {
    expect(extendStripeColors([], 3, [])).toEqual([]);
  });
});