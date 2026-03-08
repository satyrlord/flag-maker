import { describe, it, expect } from "vitest";
import { createRightbar, setRightbarVisible } from "@/ui/rightbar";

describe("createRightbar", () => {
  it("returns a div element", () => {
    const bar = createRightbar();
    expect(bar.tagName).toBe("DIV");
  });

  it("has the rightbar class", () => {
    const bar = createRightbar();
    expect(bar.classList.contains("rightbar")).toBe(true);
  });

  it("has toolbar role and aria-label", () => {
    const bar = createRightbar();
    expect(bar.getAttribute("role")).toBe("toolbar");
    expect(bar.getAttribute("aria-label")).toBe("Dynamic Tools");
  });

  it("is hidden by default (no rightbar-visible class)", () => {
    const bar = createRightbar();
    expect(bar.classList.contains("rightbar-visible")).toBe(false);
  });
});

describe("setRightbarVisible", () => {
  it("adds rightbar-visible class when true", () => {
    const bar = createRightbar();
    setRightbarVisible(bar, true);
    expect(bar.classList.contains("rightbar-visible")).toBe(true);
  });

  it("removes rightbar-visible class when false", () => {
    const bar = createRightbar();
    setRightbarVisible(bar, true);
    setRightbarVisible(bar, false);
    expect(bar.classList.contains("rightbar-visible")).toBe(false);
  });
});
