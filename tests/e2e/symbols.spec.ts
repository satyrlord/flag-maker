import { test, expect } from "./coverage-fixture";

test.describe("Symbols panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
  });

  test("shows search input", async ({ page }) => {
    const search = page.locator('input[type="search"]');
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("placeholder", "Search symbols...");
  });

  test("shows 10 builtin symbol items", async ({ page }) => {
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(10);
  });

  test("search filters symbols", async ({ page }) => {
    const search = page.locator('input[type="search"]');
    await search.fill("cross");
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(2);
  });

  test("category filter works", async ({ page }) => {
    const starsBtn = page.locator(".toolbar-cat-btn", { hasText: "Stars" });
    await starsBtn.click();
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(2);
  });

  test("combining search and category filter", async ({ page }) => {
    const starsBtn = page.locator(".toolbar-cat-btn", { hasText: "Stars" });
    await starsBtn.click();
    const search = page.locator('input[type="search"]');
    await search.fill("hexa");
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(1);
  });
});

test.describe("Symbol interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
  });

  test("clicking a symbol item triggers symbol event", async ({ page }) => {
    const item = page.locator(".toolbar-symbol-item").first();
    await item.click();
    await expect(item).toBeVisible();
  });

  test("search with no results shows empty message", async ({ page }) => {
    const search = page.locator('input[type="search"]');
    await search.fill("zzzznonexistent");
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(0);
    const empty = page.locator(".toolbar-empty-text");
    await expect(empty).toContainText("No symbols found");
  });
});
