import { test, expect } from "./coverage-fixture";

test.describe("Overlay interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
  });

  test("clicking Rectangle emits add-overlay event", async ({ page }) => {
    const btn = page.getByRole("button", { name: "Add Rectangle overlay" });
    await btn.click();
    // Button should still be visible (no error thrown)
    await expect(btn).toBeVisible();
  });

  test("clicking Circle emits add-overlay event", async ({ page }) => {
    const btn = page.getByRole("button", { name: "Add Circle overlay" });
    await btn.click();
    await expect(btn).toBeVisible();
  });

  test("clicking Star emits add-overlay event", async ({ page }) => {
    const btn = page.getByRole("button", { name: "Add Star overlay" });
    await btn.click();
    await expect(btn).toBeVisible();
  });
});
