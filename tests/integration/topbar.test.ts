import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTopbar } from "@/ui/topbar";
import * as flagRenderer from "@/flagRenderer";
import * as utils from "@/utils";

describe("createTopbar", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
  });

  it("returns a header element", () => {
    const bar = createTopbar();
    expect(bar.tagName).toBe("HEADER");
  });

  it("contains the app title", () => {
    const bar = createTopbar();
    expect(bar.textContent).toContain("Flag Maker");
  });

  it("has a theme toggle button", () => {
    const bar = createTopbar();
    const themeBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label*="light mode"], button[aria-label*="dark mode"]',
    );
    expect(themeBtn).not.toBeNull();
  });

  it("has reset, save, and export buttons", () => {
    const bar = createTopbar();
    const reset = bar.querySelector('button[aria-label="Reset flag"]');
    const save = bar.querySelector('button[aria-label="Save project"]');
    const exp = bar.querySelector('button[aria-label="Export flag"]');
    expect(reset).not.toBeNull();
    expect(save).not.toBeNull();
    expect(exp).not.toBeNull();
  });

  it("toggles dark/light class on theme button click", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);
    const themeBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label*="light mode"], button[aria-label*="dark mode"]',
    )!;

    // Start in dark mode
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    themeBtn.click();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    themeBtn.click();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    document.body.removeChild(bar);
  });

  it("export dropdown opens and closes on click", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const exportBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label="Export flag"]',
    )!;
    const menu = bar.querySelector<HTMLElement>('[role="menu"]')!;

    expect(menu.classList.contains("hidden")).toBe(true);

    exportBtn.click();
    expect(menu.classList.contains("hidden")).toBe(false);
    expect(exportBtn.getAttribute("aria-expanded")).toBe("true");

    exportBtn.click();
    expect(menu.classList.contains("hidden")).toBe(true);
    expect(exportBtn.getAttribute("aria-expanded")).toBe("false");

    document.body.removeChild(bar);
  });

  it("export menu has SVG, PNG, and JPG options", () => {
    const bar = createTopbar();
    const menuItems = bar.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(3);
    expect(menuItems[0].textContent).toBe("Export SVG");
    expect(menuItems[1].textContent).toBe("Export PNG");
    expect(menuItems[2].textContent).toBe("Export JPG");
  });

  it("spans full grid width via gridColumn style", () => {
    const bar = createTopbar();
    expect(bar.style.gridColumn).toBe("1 / -1");
  });

  it("clicking a menu item closes the dropdown", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const exportBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label="Export flag"]',
    )!;
    const menu = bar.querySelector<HTMLElement>('[role="menu"]')!;

    // Open the dropdown
    exportBtn.click();
    expect(menu.classList.contains("hidden")).toBe(false);

    // Click a menu item
    const svgItem = bar.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
    svgItem.click();
    expect(menu.classList.contains("hidden")).toBe(true);
    expect(exportBtn.getAttribute("aria-expanded")).toBe("false");

    document.body.removeChild(bar);
  });

  it("closes dropdown when clicking outside", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const exportBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label="Export flag"]',
    )!;
    const menu = bar.querySelector<HTMLElement>('[role="menu"]')!;

    // Open the dropdown
    exportBtn.click();
    expect(menu.classList.contains("hidden")).toBe(false);

    // Click outside the wrapper
    document.body.click();
    expect(menu.classList.contains("hidden")).toBe(true);
    expect(exportBtn.getAttribute("aria-expanded")).toBe("false");

    document.body.removeChild(bar);
  });

  it("reset button is clickable", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);
    const reset = bar.querySelector<HTMLButtonElement>('button[aria-label="Reset flag"]')!;
    expect(() => reset.click()).not.toThrow();
    document.body.removeChild(bar);
  });

  it("reset button dispatches topbar:reset event that bubbles", () => {
    const bar = createTopbar();
    const wrapper = document.createElement("div");
    wrapper.appendChild(bar);
    document.body.appendChild(wrapper);
    const handler = vi.fn();
    wrapper.addEventListener("topbar:reset", handler);
    const reset = bar.querySelector<HTMLButtonElement>('button[aria-label="Reset flag"]')!;
    reset.click();
    expect(handler).toHaveBeenCalledOnce();
    document.body.removeChild(wrapper);
  });

  it("save button is clickable", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);
    const save = bar.querySelector<HTMLButtonElement>('button[aria-label="Save project"]')!;
    expect(() => save.click()).not.toThrow();
    document.body.removeChild(bar);
  });

  it("Export SVG calls download with serialized SVG", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    const downloadSpy = vi.spyOn(utils, "download").mockImplementation(() => {});

    // Open menu and click Export SVG
    bar.querySelector<HTMLButtonElement>('button[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[0].click();

    expect(downloadSpy).toHaveBeenCalledOnce();
    expect(downloadSpy.mock.calls[0][0]).toBe("flag.svg");
    expect(downloadSpy.mock.calls[0][1]).toContain("<svg");
    expect(downloadSpy.mock.calls[0][2]).toBe("image/svg+xml;charset=utf-8");

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export PNG calls svgToRaster with image/png", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/png;base64,x");
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

    bar.querySelector<HTMLButtonElement>('button[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[1].click();

    // Wait for promise chain
    await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
    expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/png", 2);
    // PNG is lossless -- quality must not be forwarded.
    expect(rasterSpy.mock.calls[0][3]).toBeUndefined();
    expect(dlSpy).toHaveBeenCalledWith("data:image/png;base64,x", "flag.png");

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export JPG calls svgToRaster with image/jpeg and quality", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/jpeg;base64,y");
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

    bar.querySelector<HTMLButtonElement>('button[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[2].click();

    await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
    expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/jpeg", 2, 0.92);
    expect(dlSpy).toHaveBeenCalledWith("data:image/jpeg;base64,y", "flag.jpg");

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export PNG handles rasterization failure without downloading", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    vi.spyOn(utils, "svgToRaster").mockRejectedValue(new Error("PNG failed"));
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    bar.querySelector<HTMLButtonElement>('button[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    await expect(async () => {
      items[1].click();
      await Promise.resolve();
    }).not.toThrow();
    await vi.waitFor(() => expect(dlSpy).not.toHaveBeenCalled());

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export JPG handles rasterization failure without downloading", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    vi.spyOn(utils, "svgToRaster").mockRejectedValue(new Error("JPG failed"));
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    bar.querySelector<HTMLButtonElement>('button[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    await expect(async () => {
      items[2].click();
      await Promise.resolve();
    }).not.toThrow();
    await vi.waitFor(() => expect(dlSpy).not.toHaveBeenCalled());

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });
});
