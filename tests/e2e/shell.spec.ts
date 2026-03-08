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

test.describe("Canvas placeholder", () => {
  test("shows canvas area with placeholder text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const main = page.locator("main");
    await expect(main).toBeVisible();
    await expect(main).toContainText("Flag canvas");
  });
});
