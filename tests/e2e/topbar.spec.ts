import { test, expect } from "./coverage-fixture";

test.describe("Application settings (topbar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("is visible with app name", async ({ page }) => {
    const topbar = page.locator("header");
    await expect(topbar).toBeVisible();
    await expect(topbar).toContainText("Flag Maker");
  });

  test("has theme toggle button", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /switch to light mode/i });
    await expect(toggle).toBeVisible();
  });

  test("theme toggle switches dark/light and updates button", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /switch to light mode/i });
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    // Check initial title
    await expect(toggle).toHaveAttribute("title", "Switch to light mode");
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
    // After toggling, button label and title change
    const toggleBack = page.getByRole("button", { name: /switch to dark mode/i });
    await expect(toggleBack).toHaveAttribute("title", "Switch to dark mode");
    await toggleBack.click();
    await expect(html).toHaveClass(/dark/);
    // Title reverts
    await expect(page.getByRole("button", { name: /switch to light mode/i })).toHaveAttribute("title", "Switch to light mode");
  });

  test("has export dropdown that opens and closes", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    const menu = page.locator('header [role="menu"]');
    await expect(menu).toBeVisible();
    // Close by clicking the export button again (summary toggles details open/closed)
    await exportBtn.click();
    await expect(menu).not.toBeVisible();
  });

  test("reset and save buttons are clickable", async ({ page }) => {
    await page.getByRole("button", { name: /reset flag/i }).click();
    await page.getByRole("button", { name: /save project/i }).click();
    await expect(page.locator("header")).toBeVisible();
  });

  test("export menu has SVG, PNG, and JPG options", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const svgBtn = page.getByRole("menuitem", { name: /svg/i });
    const pngBtn = page.getByRole("menuitem", { name: /png/i });
    const jpgBtn = page.getByRole("menuitem", { name: /jpg/i });
    await expect(svgBtn).toBeVisible();
    await expect(pngBtn).toBeVisible();
    await expect(jpgBtn).toBeVisible();
  });
});

test.describe("Export menu interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("clicking Export SVG closes the menu", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const menu = page.locator('header [role="menu"]');
    await expect(menu).toBeVisible();
    const svgBtn = page.getByRole("menuitem", { name: /svg/i });
    await svgBtn.click();
    await expect(menu).not.toBeVisible();
  });

  test("Export SVG triggers a file download", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const svgBtn = page.getByRole("menuitem", { name: /svg/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      svgBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.svg");
  });

  test("clicking Export PNG closes the menu", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const pngBtn = page.getByRole("menuitem", { name: /png/i });
    await pngBtn.click();
    const menu = page.locator('header [role="menu"]');
    await expect(menu).not.toBeVisible();
  });

  test("Export PNG triggers a file download", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const pngBtn = page.getByRole("menuitem", { name: /png/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      pngBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.png");
  });

  test("clicking Export JPG closes the menu", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const jpgBtn = page.getByRole("menuitem", { name: /jpg/i });
    await jpgBtn.click();
    const menu = page.locator('header [role="menu"]');
    await expect(menu).not.toBeVisible();
  });

  test("Export JPG triggers a file download", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const jpgBtn = page.getByRole("menuitem", { name: /jpg/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      jpgBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.jpg");
  });

  test("toggling export button open then closed via button", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    const menu = page.locator('header [role="menu"]');
    await expect(menu).toBeVisible();
    // Click button again to close
    await exportBtn.click();
    await expect(menu).not.toBeVisible();
  });
});

test.describe("Export error handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Override Image so that any src assignment immediately fires onerror,
    // simulating a failed SVG-to-canvas rasterization.
    await page.evaluate(() => {
      class BrokenImage {
        _src = "";
        onerror: ((e: Event) => void) | null = null;
        onload: ((e: Event) => void) | null = null;
        get src(): string { return this._src; }
        set src(_: string) {
          this._src = _;
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event("error"));
          }, 0);
        }
      }
      (window as unknown as Record<string, unknown>).Image = BrokenImage;
    });
  });

  test("Export PNG shows error toast when rasterization fails", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    await page.getByRole("menuitem", { name: /png/i }).click();
    await expect(page.locator("body")).toContainText(/PNG export failed/i);
  });

  test("Export JPG shows error toast when rasterization fails", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    await exportBtn.click();
    await page.getByRole("menuitem", { name: /jpg/i }).click();
    await expect(page.locator("body")).toContainText(/JPG export failed/i);
  });

  test("second export error replaces the first toast", async ({ page }) => {
    const exportBtn = page.locator('[aria-label="Export flag"]');
    // Trigger first error
    await exportBtn.click();
    await page.getByRole("menuitem", { name: /png/i }).click();
    await expect(page.locator("body")).toContainText(/PNG export failed/i);
    // Trigger second error before the toast auto-hides
    await exportBtn.click();
    await page.getByRole("menuitem", { name: /png/i }).click();
    // Toast should still be visible (replaced, not doubled)
    await expect(page.locator("body")).toContainText(/PNG export failed/i);
  });
});
