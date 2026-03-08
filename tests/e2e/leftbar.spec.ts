import { test, expect } from "./coverage-fixture";

test.describe("Flag editor (leftbar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("aside leftbar is visible", async ({ page }) => {
    const aside = page.locator("aside.toolbar");
    await expect(aside).toBeVisible();
  });

  test("has 5 tab buttons", async ({ page }) => {
    const tabs = page.locator('nav[aria-label="Toolbar tabs"] button');
    await expect(tabs).toHaveCount(5);
  });

  test("tab buttons have aria labels", async ({ page }) => {
    const labels = ["Ratio", "Stripes", "Overlays", "Templates", "Symbols"];
    for (const label of labels) {
      const btn = page.getByRole("button", { name: label, exact: true });
      await expect(btn).toBeVisible();
    }
  });

  test("shows Ratio panel by default with ratio buttons", async ({ page, viewport }) => {
    if (viewport && viewport.width < 1280) {
      // On mobile, the panel is collapsed; click the Ratio tab to open it
      await page.getByRole("button", { name: "Ratio", exact: true }).click();
    }
    const ratioBtn = page.locator(".toolbar-ratio-btn").first();
    await expect(ratioBtn).toBeVisible();
  });

  test("clicking 1:1 ratio highlights it", async ({ page, viewport }) => {
    if (viewport && viewport.width < 1280) {
      await page.getByRole("button", { name: "Ratio", exact: true }).click();
    }
    const btn = page.getByRole("button", { name: "Set ratio to 1:1" });
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    const prev = page.getByRole("button", { name: "Set ratio to 2:3" });
    await expect(prev).not.toHaveClass(/active/);
  });
});

test.describe("Flag editor tab switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("switching to Stripes tab shows orientation controls", async ({ page }) => {
    await page.getByRole("button", { name: "Stripes", exact: true }).click();
    const orientBtn = page.locator(".toolbar-orient-btn").first();
    await expect(orientBtn).toBeVisible();
  });

  test("switching to Overlays tab shows add buttons", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    const addBtn = page.locator(".toolbar-add-btn").first();
    await expect(addBtn).toBeVisible();
  });

  test("switching to Templates tab shows template thumbnails", async ({ page }) => {
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    const item = page.locator(".toolbar-template-item").first();
    await expect(item).toBeVisible();
  });

  test("switching to Symbols tab shows symbol grid", async ({ page }) => {
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
    const item = page.locator(".toolbar-symbol-item").first();
    await expect(item).toBeVisible();
  });

  test("clicking same tab on mobile toggles panel closed", async ({ page, viewport }) => {
    // Only applies to mobile viewports where the panel opens/closes on tab click
    if (viewport && viewport.width >= 1280) return;
    const stripesBtn = page.getByRole("button", { name: "Stripes", exact: true });
    await stripesBtn.click();
    const panel = page.locator(".toolbar-panel");
    await expect(panel).toHaveClass(/panel-open/);
    // Click the same tab again to close the panel
    await stripesBtn.click();
    await expect(panel).not.toHaveClass(/panel-open/);
  });
});
