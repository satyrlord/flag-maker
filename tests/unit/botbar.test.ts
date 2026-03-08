import { describe, it, expect } from "vitest";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from "@/ui/botbar";

describe("botbar constants", () => {
  it("exports correct zoom constants", () => {
    expect(ZOOM_MIN).toBe(10);
    expect(ZOOM_MAX).toBe(100);
    expect(ZOOM_STEP).toBe(10);
    expect(ZOOM_DEFAULT).toBe(100);
  });
});