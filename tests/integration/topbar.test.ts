import { describe, it, expect, beforeEach } from "vitest";
import { createTopbar } from "@/ui/topbar";

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

  it("export menu has SVG and PNG options", () => {
    const bar = createTopbar();
    const menuItems = bar.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(2);
    expect(menuItems[0].textContent).toBe("Export SVG");
    expect(menuItems[1].textContent).toBe("Export PNG");
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

  it("save button is clickable", () => {
    const bar = createTopbar();
    document.body.appendChild(bar);
    const save = bar.querySelector<HTMLButtonElement>('button[aria-label="Save project"]')!;
    expect(() => save.click()).not.toThrow();
    document.body.removeChild(bar);
  });
});
