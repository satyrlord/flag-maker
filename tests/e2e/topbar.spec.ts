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

  test("theme toggle switches dark/light", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /switch to light mode/i });
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
    // After toggling, button label changes to "Switch to dark mode"
    const toggleBack = page.getByRole("button", { name: /switch to dark mode/i });
    await toggleBack.click();
    await expect(html).toHaveClass(/dark/);
  });

  test("has export dropdown that opens and closes", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    // Close by clicking elsewhere
    await page.locator("header").click({ position: { x: 10, y: 10 } });
    await expect(menu).not.toBeVisible();
  });

  test("reset and save buttons are clickable", async ({ page }) => {
    await page.getByRole("button", { name: /reset flag/i }).click();
    await page.getByRole("button", { name: /save project/i }).click();
    await expect(page.locator("header")).toBeVisible();
  });

  test("export menu has SVG, PNG, and JPG options", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
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
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    const svgBtn = page.getByRole("menuitem", { name: /svg/i });
    await svgBtn.click();
    await expect(menu).not.toBeVisible();
  });

  test("Export SVG triggers a file download", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const svgBtn = page.getByRole("menuitem", { name: /svg/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      svgBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.svg");
  });

  test("clicking Export PNG closes the menu", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const pngBtn = page.getByRole("menuitem", { name: /png/i });
    await pngBtn.click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).not.toBeVisible();
  });

  test("Export PNG triggers a file download", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const pngBtn = page.getByRole("menuitem", { name: /png/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      pngBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.png");
  });

  test("clicking Export JPG closes the menu", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const jpgBtn = page.getByRole("menuitem", { name: /jpg/i });
    await jpgBtn.click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).not.toBeVisible();
  });

  test("Export JPG triggers a file download", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const jpgBtn = page.getByRole("menuitem", { name: /jpg/i });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      jpgBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("flag.jpg");
  });

  test("toggling export button open then closed via button", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export flag/i });
    await exportBtn.click();
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    // Click button again to close
    await exportBtn.click();
    await expect(menu).not.toBeVisible();
  });
});
