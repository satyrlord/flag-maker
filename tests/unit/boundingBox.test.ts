import { describe, it, expect } from "vitest";
import {
  createBoundingBoxContainer,
  createBoundingBox,
} from "@/ui/boundingBox";
import type { BoundingBoxRect } from "@/ui/boundingBox";

describe("createBoundingBoxContainer", () => {
  it("returns a div with class bb-container", () => {
    const el = createBoundingBoxContainer();
    expect(el.tagName).toBe("DIV");
    expect(el.className).toBe("bb-container");
  });

  it("has absolute positioning and pointer-events: none", () => {
    const el = createBoundingBoxContainer();
    expect(el.style.position).toBe("absolute");
    expect(el.style.pointerEvents).toBe("none");
  });
});

describe("createBoundingBox", () => {
  it("returns container, frame, handles map, and control methods", () => {
    const bb = createBoundingBox();
    expect(bb.container).toBeInstanceOf(HTMLDivElement);
    expect(bb.frame).toBeInstanceOf(HTMLDivElement);
    expect(bb.handles).toBeInstanceOf(Map);
    expect(typeof bb.update).toBe("function");
    expect(typeof bb.show).toBe("function");
    expect(typeof bb.hide).toBe("function");
  });

  it("frame is a child of container", () => {
    const bb = createBoundingBox();
    expect(bb.container.contains(bb.frame)).toBe(true);
  });

  it("frame has class bb-frame", () => {
    const bb = createBoundingBox();
    expect(bb.frame.className).toBe("bb-frame");
  });

  it("creates exactly 10 handles", () => {
    const bb = createBoundingBox();
    expect(bb.handles.size).toBe(10);
  });

  it("has all expected handle IDs", () => {
    const bb = createBoundingBox();
    const expectedIds = ["nw", "ne", "sw", "se", "n", "s", "e", "w", "move", "rotate"];
    for (const id of expectedIds) {
      expect(bb.handles.has(id as never)).toBe(true);
    }
  });

  it("each handle has data-handle-id attribute matching its key", () => {
    const bb = createBoundingBox();
    for (const [id, el] of bb.handles) {
      expect(el.dataset.handleId).toBe(id);
    }
  });

  it("corner handles exist with correct handle IDs", () => {
    const bb = createBoundingBox();
    for (const id of ["nw", "ne", "sw", "se"] as const) {
      const el = bb.handles.get(id)!;
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(el.dataset.handleId).toBe(id);
    }
  });

  it("side handles exist with correct handle IDs", () => {
    const bb = createBoundingBox();
    for (const id of ["n", "s", "e", "w"] as const) {
      const el = bb.handles.get(id)!;
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(el.dataset.handleId).toBe(id);
    }
  });

  it("move handle exists", () => {
    const bb = createBoundingBox();
    const el = bb.handles.get("move")!;
    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(el.dataset.handleId).toBe("move");
  });

  it("rotate handle exists", () => {
    const bb = createBoundingBox();
    const el = bb.handles.get("rotate")!;
    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(el.dataset.handleId).toBe("rotate");
  });

  it("all handles are HTMLDivElement instances attached to the frame", () => {
    const bb = createBoundingBox();
    for (const [, el] of bb.handles) {
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(el.parentElement).toBe(bb.frame);
    }
  });

  it("is hidden initially", () => {
    const bb = createBoundingBox();
    expect(bb.container.style.display).toBe("none");
  });

  it("show() makes container visible", () => {
    const bb = createBoundingBox();
    bb.show();
    expect(bb.container.style.display).toBe("");
  });

  it("hide() hides container", () => {
    const bb = createBoundingBox();
    bb.show();
    bb.hide();
    expect(bb.container.style.display).toBe("none");
  });

  it("update() sets frame position, size, and rotation", () => {
    const bb = createBoundingBox();
    const rect: BoundingBoxRect = { left: 10, top: 20, width: 100, height: 50, rotation: 45 };
    bb.update(rect);
    expect(bb.frame.style.left).toBe("10px");
    expect(bb.frame.style.top).toBe("20px");
    expect(bb.frame.style.width).toBe("100px");
    expect(bb.frame.style.height).toBe("50px");
    expect(bb.frame.style.transform).toBe("rotate(45deg)");
  });

  it("update() with rotation=0 clears transform", () => {
    const bb = createBoundingBox();
    bb.update({ left: 0, top: 0, width: 50, height: 50, rotation: 30 });
    expect(bb.frame.style.transform).toBe("rotate(30deg)");
    bb.update({ left: 0, top: 0, width: 50, height: 50, rotation: 0 });
    expect(bb.frame.style.transform).toBe("");
  });

  it("handles are children of the frame", () => {
    const bb = createBoundingBox();
    for (const [, el] of bb.handles) {
      expect(bb.frame.contains(el)).toBe(true);
    }
  });

  it("frame contains a connector line (non-handle child)", () => {
    const bb = createBoundingBox();
    // 10 handles + 1 connector line = at least 11 children
    expect(bb.frame.children.length).toBeGreaterThanOrEqual(11);
  });
});
