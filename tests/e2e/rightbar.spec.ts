import { test, expect } from "./coverage-fixture";

test.describe("Dynamic Tools (rightbar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("is visible by default (has grid tool)", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    await expect(rightbar).toBeAttached();
    await expect(rightbar).toHaveClass(/rightbar-visible/);
  });

  test("remains visible on narrow landscape layouts", async ({ page }) => {
    await page.setViewportSize({ width: 740, height: 412 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("toolbar", { name: "Dynamic Tools" })).toBeVisible();
  });

  test("has a drag handle", async ({ page }) => {
    const handle = page.locator(".rightbar-drag-handle");
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("aria-label", "Drag to reposition toolbar");
  });

  test("drag handle repositions the toolbar", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    const handle = page.locator(".rightbar-drag-handle");

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    // Drag the toolbar 100px to the left and 50px down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 100, startY + 50, { steps: 5 });
    await page.mouse.up();

    await expect(rightbar).toHaveClass(/rightbar-custom-pos/);
    await expect(rightbar).not.toHaveClass(/rightbar-dragging/);
  });

  test("drag handle supports keyboard repositioning", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    const handle = page.locator(".rightbar-drag-handle");

    await handle.focus();
    await handle.evaluate((element) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });

    await expect(rightbar).toHaveClass(/rightbar-custom-pos/);
    await expect(rightbar).toHaveCSS("left", /px$/);
    await expect(rightbar).toHaveCSS("top", /px$/);
  });

  test("shift+arrow moves the drag handle by a larger step", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    const handle = page.locator(".rightbar-drag-handle");

    await handle.focus();
    // Shift+arrow uses step=32 instead of step=16
    await handle.evaluate((element) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true }));
      // A second press exercises the ensureCustomPosition early-return path
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true }));
    });

    await expect(rightbar).toHaveClass(/rightbar-custom-pos/);
  });

  test("responds to visibility events", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("rightbar:visibility", {
          detail: { visible: true },
          bubbles: true,
        }),
      );
    });
    await expect(rightbar).toHaveClass(/rightbar-visible/);

    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("rightbar:visibility", {
          detail: { visible: false },
          bubbles: true,
        }),
      );
    });
    await expect(rightbar).not.toHaveClass(/rightbar-visible/);
  });

  test("grid button cycles through auto-selected color, off, and back", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await expect(gridBtn).toBeVisible();
    await expect(gridBtn).toHaveAttribute("aria-pressed", "false");

    // Click 1: off -> auto-selected magenta for the default Per Pale startup flag
    await gridBtn.click();
    await expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    await expect(gridBtn).toHaveClass(/rightbar-btn-magenta/);

    // Click 2: auto-selected color -> off
    await gridBtn.click();
    await expect(gridBtn).toHaveAttribute("aria-pressed", "false");

    // Click 3: off -> auto-selected color again
    await gridBtn.click();
    await expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    await expect(gridBtn).toHaveClass(/rightbar-btn-magenta/);
  });

  test("grid button shows a grid overlay on the flag when active", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click();
    const gridSvg = page.locator(".grid-overlay");
    await expect(gridSvg).toBeAttached();

    // Turn off
    await gridBtn.click(); // off
    await expect(gridSvg).not.toBeAttached();
  });

  test("right-click on grid button opens size menu", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click({ button: "right" });
    const sizeMenu = page.getByLabel("Grid size");
    await expect(sizeMenu).toHaveClass(/menu-open/);
  });

  test("selecting a size from the menu updates the grid", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    // Activate grid first
    await gridBtn.click();
    await expect(page.locator(".grid-overlay")).toBeAttached();

    // Open size menu and pick a different size
    await gridBtn.click({ button: "right" });
    const sizeMenu = page.getByLabel("Grid size");
    await expect(sizeMenu).toHaveClass(/menu-open/);

    const items = sizeMenu.locator(".rightbar-grid-menu-item");
    await items.nth(2).click(); // 10x10
    await expect(sizeMenu).not.toHaveClass(/menu-open/);
    // Grid should still be visible after size change
    await expect(page.locator(".grid-overlay")).toBeAttached();
  });

  test("selecting a size while grid is off does not show grid", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    // Grid is off by default; open menu and pick a size
    await gridBtn.click({ button: "right" });
    const sizeMenu = page.getByLabel("Grid size");
    const items = sizeMenu.locator(".rightbar-grid-menu-item");
    await items.nth(3).click(); // 20x20
    // Grid should NOT appear
    await expect(page.locator(".grid-overlay")).not.toBeAttached();
  });

  test("clicking outside closes the size menu", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click({ button: "right" });
    const sizeMenu = page.getByLabel("Grid size");
    await expect(sizeMenu).toHaveClass(/menu-open/);
    // Click on the canvas to dismiss
    await page.locator("main.flag-canvas").click({ position: { x: 50, y: 50 } });
    await expect(sizeMenu).not.toHaveClass(/menu-open/);
  });

  test("escape closes the size menu from the drag handle", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    const handle = page.locator(".rightbar-drag-handle");

    await gridBtn.click({ button: "right" });
    const sizeMenu = page.getByLabel("Grid size");
    await expect(sizeMenu).toHaveClass(/menu-open/);

    await handle.focus();
    await handle.evaluate((element) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    await expect(sizeMenu).not.toHaveClass(/menu-open/);
  });

  test("grid button has a tooltip", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    const title = await gridBtn.getAttribute("title");
    expect(title).toContain("Click");
    expect(title).toContain("Scroll");
    expect(title).toContain("Right-click");
  });

  test("wheel scroll on grid button cycles grid size when active", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    // Activate grid
    await gridBtn.click();
    await expect(page.locator(".grid-overlay")).toBeAttached();

    // Scroll down to change size
    await gridBtn.hover();
    await page.mouse.wheel(0, 120);
    // Grid should still be visible
    await expect(page.locator(".grid-overlay")).toBeAttached();
  });

  test("wheel scroll on grid button is ignored when inactive", async ({ page }) => {
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    // Grid is off; scroll should do nothing
    await gridBtn.hover();
    await page.mouse.wheel(0, 120);
    await expect(page.locator(".grid-overlay")).not.toBeAttached();
  });

  test("grid auto-selects magenta when the default flag is light-dominant", async ({ page }) => {
    // The default Per Pale template mixes a very dark field with a very light one,
    // yielding a light-dominant average luminance that should prefer magenta.
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click();
    await expect(gridBtn).toHaveClass(/rightbar-btn-magenta/);
  });

  test("grid auto-selects magenta when the flag is light-colored", async ({ page }) => {
    // Change all stripe colors to white via the Stripes panel, then enable the grid.
    await page.getByRole("button", { name: "Stripes", exact: true }).click();
    const pickers = page.locator(".toolbar-color-picker");
    const count = await pickers.count();
    for (let i = 0; i < count; i++) {
      await pickers.nth(i).evaluate((el: HTMLInputElement) => {
        el.value = "#ffffff";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click();
    await expect(gridBtn).toHaveClass(/rightbar-btn-magenta/);
  });
});
