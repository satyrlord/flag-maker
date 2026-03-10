import { describe, it, expect } from "vitest";
import { computeExportScale } from "@/ui/topbar";
import { VIEW_W } from "@/geometry";

describe("computeExportScale", () => {
  it("computes correct scale for a square (1:1) ratio at 100 pxPerRatio", () => {
    expect(computeExportScale(100, 1)).toBeCloseTo(100 / VIEW_W);
  });

  it("computes correct scale for a 2:3 ratio at 500 pxPerRatio", () => {
    expect(computeExportScale(500, 3)).toBeCloseTo(1500 / VIEW_W);
  });

  it("computes correct scale for a 1:2 ratio at 1000 pxPerRatio", () => {
    expect(computeExportScale(1000, 2)).toBeCloseTo(2000 / VIEW_W);
  });

  it("scale is proportional to pxPerRatio", () => {
    expect(computeExportScale(1000, 3)).toBeCloseTo(computeExportScale(500, 3) * 2);
  });

  it("scale is proportional to ratioWidth", () => {
    expect(computeExportScale(500, 6)).toBeCloseTo(computeExportScale(500, 3) * 2);
  });
});
