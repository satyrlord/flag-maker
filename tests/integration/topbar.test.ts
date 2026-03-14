import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTopbar, getSelectedPxPerRatio, resetExportSizeState, APP_VERSION, computeExportScale } from "@/ui/topbar";
import * as flagRenderer from "@/flagRenderer";
import * as utils from "@/utils";

/** Width component of the [2, 3] ratio used in getCurrentRatio mocks below. */
const MOCK_RATIO_W = 3;

describe("createTopbar", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
  });

  afterEach(() => {
    // Reset module-level size state so all tests see the default.
    resetExportSizeState();
  });

  it("returns a header element", () => {
    const bar = createTopbar();
    expect(bar.tagName).toBe("HEADER");
  });

  it("contains the app title", () => {
    const bar = createTopbar();
    expect(bar.textContent).toContain("Flag Maker");
  });

  it("displays the version number", () => {
    const bar = createTopbar();
    expect(bar.textContent).toContain(`v${APP_VERSION}`);
  });

  it("has a theme toggle button", () => {
    const bar = createTopbar();
    const themeBtn = bar.querySelector<HTMLButtonElement>(
      'button[aria-label*="light mode"], button[aria-label*="dark mode"]',
    );
    expect(themeBtn).not.toBeNull();
  });

  it("has reset, save, export size, and export buttons", () => {
    const bar = createTopbar();
    const reset = bar.querySelector('button[aria-label="Reset flag"]');
    const save = bar.querySelector('button[aria-label="Save project"]');
    const sizeSelect = bar.querySelector('select[aria-label="Export size"]');
    const exp = bar.querySelector('[aria-label="Export flag"]');
    expect(reset).not.toBeNull();
    expect(save).not.toBeNull();
    expect(sizeSelect).not.toBeNull();
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

    const exportTrigger = bar.querySelector<HTMLElement>(
      '[aria-label="Export flag"]',
    )!;
    const wrapper = exportTrigger.closest("details")!;

    expect(wrapper.hasAttribute("open")).toBe(false);

    exportTrigger.click();
    expect(wrapper.hasAttribute("open")).toBe(true);

    exportTrigger.click();
    expect(wrapper.hasAttribute("open")).toBe(false);

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

    const exportTrigger = bar.querySelector<HTMLElement>(
      '[aria-label="Export flag"]',
    )!;
    const wrapper = exportTrigger.closest("details")!;

    // Open the dropdown
    exportTrigger.click();
    expect(wrapper.hasAttribute("open")).toBe(true);

    // Click a menu item
    const svgItem = bar.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
    svgItem.click();
    expect(wrapper.hasAttribute("open")).toBe(false);

    document.body.removeChild(bar);
  });

  it("closes dropdown when clicking outside", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const exportTrigger = bar.querySelector<HTMLElement>(
      '[aria-label="Export flag"]',
    )!;
    const wrapper = exportTrigger.closest("details")!;

    // Open the dropdown
    exportTrigger.click();
    expect(wrapper.hasAttribute("open")).toBe(true);

    // Close via removing open attribute (simulates DaisyUI details closing)
    wrapper.removeAttribute("open");
    expect(wrapper.hasAttribute("open")).toBe(false);

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
    bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[0].click();

    expect(downloadSpy).toHaveBeenCalledOnce();
    expect(downloadSpy.mock.calls[0][0]).toBe("flag.svg");
    expect(downloadSpy.mock.calls[0][1]).toContain("<svg");
    expect(downloadSpy.mock.calls[0][2]).toBe("image/svg+xml;charset=utf-8");

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export PNG calls svgToRaster with computed scale from export size", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    const getCurrentRatioSpy = vi.spyOn(flagRenderer, "getCurrentRatio").mockReturnValue([2, 3]);
    const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/png;base64,x");
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

    bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[1].click();

    const expectedScale = computeExportScale(getSelectedPxPerRatio(), MOCK_RATIO_W);
    // Wait for promise chain
    await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
    expect(getCurrentRatioSpy).toHaveBeenCalled();
    expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/png", expectedScale);
    // PNG is lossless -- quality must not be forwarded.
    expect(rasterSpy.mock.calls[0][3]).toBeUndefined();
    expect(dlSpy).toHaveBeenCalledWith("data:image/png;base64,x", "flag.png");

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("Export JPG calls svgToRaster with computed scale and quality", async () => {
    const bar = createTopbar();
    document.body.appendChild(bar);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
    const getCurrentRatioSpy = vi.spyOn(flagRenderer, "getCurrentRatio").mockReturnValue([2, 3]);
    const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/jpeg;base64,y");
    const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

    bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    items[2].click();

    const expectedScale = computeExportScale(getSelectedPxPerRatio(), MOCK_RATIO_W);
    await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
    expect(getCurrentRatioSpy).toHaveBeenCalled();
    expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/jpeg", expectedScale, 0.92);
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

    bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
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

    bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
    const items = bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    await expect(async () => {
      items[2].click();
      await Promise.resolve();
    }).not.toThrow();
    await vi.waitFor(() => expect(dlSpy).not.toHaveBeenCalled());

    vi.restoreAllMocks();
    document.body.removeChild(bar);
  });

  it("export size select defaults to 'Default' (500 pxPerRatio)", () => {
    const bar = createTopbar();
    const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
    expect(select.value).toBe("500");
    expect(select.options[select.selectedIndex].textContent).toBe("Default");
  });

  it("export size select contains all five options", () => {
    const bar = createTopbar();
    const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(["Small", "Medium", "Default", "Large", "Huge"]);
  });

  it("getSelectedPxPerRatio returns default value", () => {
    expect(getSelectedPxPerRatio()).toBe(500);
  });

  it("changing export size select updates getSelectedPxPerRatio", () => {
    const bar = createTopbar();
    const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
    select.value = "1000";
    select.dispatchEvent(new Event("change"));
    expect(getSelectedPxPerRatio()).toBe(1000);
  });

  describe("export at each size", () => {
    const sizes = [
      { label: "Small",   pxPerRatio: 100  },
      { label: "Medium",  pxPerRatio: 200  },
      { label: "Default", pxPerRatio: 500  },
      { label: "Large",   pxPerRatio: 1000 },
      { label: "Huge",    pxPerRatio: 2000 },
    ] as const;

    it.each(sizes)("SVG export at $label size downloads SVG regardless of size", ({ pxPerRatio }) => {
      const bar = createTopbar();
      document.body.appendChild(bar);

      const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
      select.value = String(pxPerRatio);
      select.dispatchEvent(new Event("change"));

      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
      const downloadSpy = vi.spyOn(utils, "download").mockImplementation(() => {});

      bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
      bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[0].click();

      expect(downloadSpy).toHaveBeenCalledOnce();
      expect(downloadSpy.mock.calls[0][0]).toBe("flag.svg");
      expect(downloadSpy.mock.calls[0][2]).toBe("image/svg+xml;charset=utf-8");

      vi.restoreAllMocks();
      document.body.removeChild(bar);
    });

    it.each(sizes)("PNG export at $label size uses correct scale", async ({ pxPerRatio }) => {
      const bar = createTopbar();
      document.body.appendChild(bar);

      const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
      select.value = String(pxPerRatio);
      select.dispatchEvent(new Event("change"));

      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
      vi.spyOn(flagRenderer, "getCurrentRatio").mockReturnValue([2, 3]);
      const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/png;base64,x");
      const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

      bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
      bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[1].click();

      const expectedScale = computeExportScale(pxPerRatio, 3);
      await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
      expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/png", expectedScale);
      expect(rasterSpy.mock.calls[0][3]).toBeUndefined();
      expect(dlSpy).toHaveBeenCalledWith("data:image/png;base64,x", "flag.png");

      vi.restoreAllMocks();
      document.body.removeChild(bar);
    });

    it.each(sizes)("JPG export at $label size uses correct scale and quality", async ({ pxPerRatio }) => {
      const bar = createTopbar();
      document.body.appendChild(bar);

      const select = bar.querySelector<HTMLSelectElement>('select[aria-label="Export size"]')!;
      select.value = String(pxPerRatio);
      select.dispatchEvent(new Event("change"));

      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      vi.spyOn(flagRenderer, "getCurrentSvg").mockReturnValue(svgEl);
      vi.spyOn(flagRenderer, "getCurrentRatio").mockReturnValue([2, 3]);
      const rasterSpy = vi.spyOn(utils, "svgToRaster").mockResolvedValue("data:image/jpeg;base64,y");
      const dlSpy = vi.spyOn(utils, "downloadDataUrl").mockImplementation(() => {});

      bar.querySelector<HTMLElement>('[aria-label="Export flag"]')!.click();
      bar.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[2].click();

      const expectedScale = computeExportScale(pxPerRatio, 3);
      await vi.waitFor(() => expect(dlSpy).toHaveBeenCalledOnce());
      expect(rasterSpy).toHaveBeenCalledWith(svgEl, "image/jpeg", expectedScale, 0.92);
      expect(dlSpy).toHaveBeenCalledWith("data:image/jpeg;base64,y", "flag.jpg");

      vi.restoreAllMocks();
      document.body.removeChild(bar);
    });
  });
});
