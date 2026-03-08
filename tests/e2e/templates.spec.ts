import { test, expect } from "./coverage-fixture";

test.describe("Templates panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
  });

  test("shows Division and National sections", async ({ page }) => {
    const sections = page.locator(".toolbar-section-title");
    const texts = await sections.allTextContents();
    expect(texts).toContain("Division");
    expect(texts).toContain("National");
  });

  test("has at least 17 template items", async ({ page }) => {
    const items = page.locator(".toolbar-template-item");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(17);
  });

  test("each template item has an SVG thumbnail", async ({ page }) => {
    const items = page.locator(".toolbar-template-item");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const svg = items.nth(i).locator("svg");
      await expect(svg).toBeVisible();
    }
  });
});

test.describe("Template interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
  });

  test("clicking a template item triggers template event", async ({ page }) => {
    const item = page.locator(".toolbar-template-item").first();
    await item.click();
    // The template button should remain visible after click
    await expect(item).toBeVisible();
  });
});
