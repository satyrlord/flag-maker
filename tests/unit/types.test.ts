import { describe, it, expect } from "vitest";
import { collectSymbolIds } from "@/types";
import type { Overlay } from "@/types";

function sym(symbolId: string): Overlay {
  return { id: "x", type: "symbol", x: 0, y: 0, w: 10, h: 10, rotation: 0, fill: "#000", stroke: "#0000", strokeWidth: 0, opacity: 1, symbolId };
}

function rect(): Overlay {
  return { id: "x", type: "rectangle", x: 0, y: 0, w: 10, h: 10, rotation: 0, fill: "#000", stroke: "#0000", strokeWidth: 0, opacity: 1 };
}

describe("collectSymbolIds", () => {
  it("returns empty array for no overlays", () => {
    expect(collectSymbolIds([])).toEqual([]);
  });

  it("returns empty array for overlays with no symbol overlays", () => {
    expect(collectSymbolIds([rect(), rect()])).toEqual([]);
  });

  it("extracts a single symbol id", () => {
    expect(collectSymbolIds([sym("star_five_pointed")])).toEqual(["star_five_pointed"]);
  });

  it("extracts multiple distinct symbol ids in order", () => {
    expect(collectSymbolIds([sym("a"), sym("b"), sym("c")])).toEqual(["a", "b", "c"]);
  });

  it("deduplicates repeated symbol ids", () => {
    expect(collectSymbolIds([sym("a"), sym("a"), sym("b")])).toEqual(["a", "b"]);
  });

  it("filters out non-symbol overlays", () => {
    expect(collectSymbolIds([rect(), sym("a"), rect()])).toEqual(["a"]);
  });

  it("filters out symbol overlays with empty symbolId", () => {
    const empty = sym("");
    expect(collectSymbolIds([empty, sym("a")])).toEqual(["a"]);
  });
});
