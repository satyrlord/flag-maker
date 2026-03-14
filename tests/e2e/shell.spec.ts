import { test, expect } from "./coverage-fixture";

test.describe("App shell loads", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("page has correct title", async ({ page }) => {
    await expect(page).toHaveTitle("Flag Maker");
  });

  test("root element renders the app shell", async ({ page }) => {
    const root = page.locator("#root");
    await expect(root).toHaveClass(/app-shell/);
  });

  test("dark mode is enabled by default", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe("Canvas rendering", () => {
  test("shows a rendered flag and zoom controls", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const main = page.locator("main");
    await expect(main).toBeVisible();
    await expect(main.locator("svg.flag-svg")).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toBeVisible();
  });
});

test.describe("UI compliance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("all select elements use DaisyUI select component class", async ({ page }) => {
    // DaisyUI select components carry the 'select' class.
    const selects = page.locator("select");
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(selects.nth(i)).toHaveClass(/\bselect\b/);
    }
  });
});
