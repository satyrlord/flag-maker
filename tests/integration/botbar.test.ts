import { describe, it, expect, vi } from "vitest";
import { createBotbar, ZOOM_MIN, ZOOM_MAX } from "@/ui/botbar";

describe("createBotbar", () => {
  it("returns a div element", () => {
    const { element } = createBotbar();
    expect(element.tagName).toBe("DIV");
  });

  it("has the botbar class", () => {
    const { element } = createBotbar();
    expect(element.classList.contains("botbar")).toBe(true);
  });

  it("has toolbar role and aria-label", () => {
    const { element } = createBotbar();
    expect(element.getAttribute("role")).toBe("toolbar");
    expect(element.getAttribute("aria-label")).toBe("Zoom Level");
  });

  it("contains zoom-out, level display, and zoom-in", () => {
    const { element } = createBotbar();
    const btns = element.querySelectorAll("button");
    expect(btns).toHaveLength(2);
    expect(btns[0].getAttribute("aria-label")).toBe("Zoom out");
    expect(btns[1].getAttribute("aria-label")).toBe("Zoom in");
    const level = element.querySelector(".botbar-level");
    expect(level).not.toBeNull();
    expect(level!.textContent).toBe("100%");
  });

  it("zoom-out decreases the level", () => {
    const { element } = createBotbar();
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const level = element.querySelector(".botbar-level")!;
    btnOut.click();
    expect(level.textContent).toBe("90%");
  });

  it("zoom-in is disabled at 100%", () => {
    const { element } = createBotbar();
    const btnIn = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;
    expect(btnIn.disabled).toBe(true);
  });

  it("zoom-out stops at minimum", () => {
    const { element } = createBotbar();
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const level = element.querySelector(".botbar-level")!;
    for (let i = 0; i < 20; i++) btnOut.click();
    expect(level.textContent).toBe(`${ZOOM_MIN}%`);
  });

  it("zoom-in increases the level after zooming out", () => {
    const { element } = createBotbar();
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const btnIn = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;
    const level = element.querySelector(".botbar-level")!;
    btnOut.click();
    btnOut.click();
    expect(level.textContent).toBe("80%");
    btnIn.click();
    expect(level.textContent).toBe("90%");
  });

  it("dispatches botbar:zoom event on zoom-out", () => {
    const { element } = createBotbar();
    const handler = vi.fn();
    element.addEventListener("botbar:zoom", handler);
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    btnOut.click();
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ zoom: 90 });
  });

  it("dispatches botbar:zoom event on zoom-in", () => {
    const { element } = createBotbar();
    const handler = vi.fn();
    element.addEventListener("botbar:zoom", handler);
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const btnIn = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;
    btnOut.click(); // 90%
    btnOut.click(); // 80%
    handler.mockClear();
    btnIn.click(); // 90%
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ zoom: 90 });
  });

  it("botbar:zoom event bubbles", () => {
    const { element } = createBotbar();
    const wrapper = document.createElement("div");
    wrapper.appendChild(element);
    const handler = vi.fn();
    wrapper.addEventListener("botbar:zoom", handler);
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    btnOut.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("setZoom updates display without emitting event", () => {
    const { element, setZoom } = createBotbar();
    const handler = vi.fn();
    element.addEventListener("botbar:zoom", handler);
    setZoom(42);
    const level = element.querySelector(".botbar-level")!;
    expect(level.textContent).toBe("42%");
    expect(handler).not.toHaveBeenCalled();
  });

  it("setZoom clamps to ZOOM_MIN and ZOOM_MAX", () => {
    const { element, setZoom } = createBotbar();
    const level = element.querySelector(".botbar-level")!;
    setZoom(0);
    expect(level.textContent).toBe(`${ZOOM_MIN}%`);
    setZoom(999);
    expect(level.textContent).toBe(`${ZOOM_MAX}%`);
  });

  it("setZoom at boundaries enables and disables correct buttons", () => {
    const { element, setZoom } = createBotbar();
    const btnOut = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const btnIn = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;

    setZoom(ZOOM_MIN);
    expect(btnOut.disabled).toBe(true);
    expect(btnIn.disabled).toBe(false);

    setZoom(ZOOM_MAX);
    expect(btnOut.disabled).toBe(false);
    expect(btnIn.disabled).toBe(true);

    setZoom(50);
    expect(btnOut.disabled).toBe(false);
    expect(btnIn.disabled).toBe(false);
  });
});
