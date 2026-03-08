import { test, expect } from "./coverage-fixture";

test.describe("Stripes panel interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Stripes", exact: true }).click();
  });

  test("stripe count starts at 3", async ({ page }) => {
    const label = page.locator(".toolbar-count-label");
    await expect(label).toHaveText("3");
  });

  test("clicking + increments stripe count", async ({ page }) => {
    const plus = page.getByRole("button", { name: "Increase stripe count" });
    await plus.click();
    const label = page.locator(".toolbar-count-label");
    await expect(label).toHaveText("4");
  });

  test("clicking - decrements stripe count", async ({ page }) => {
    const minus = page.getByRole("button", { name: "Decrease stripe count" });
    await minus.click();
    const label = page.locator(".toolbar-count-label");
    await expect(label).toHaveText("2");
  });

  test("color pickers match stripe count after increment", async ({ page }) => {
    const plus = page.getByRole("button", { name: "Increase stripe count" });
    await plus.click();
    const pickers = page.locator(".toolbar-color-picker");
    await expect(pickers).toHaveCount(4);
  });

  test("switching orientation toggles active button", async ({ page }) => {
    const vBtn = page.locator(".toolbar-orient-btn", { hasText: "Vertical" });
    await vBtn.click();
    await expect(vBtn).toHaveClass(/active/);
    const hBtn = page.locator(".toolbar-orient-btn", { hasText: "Horizontal" });
    await expect(hBtn).not.toHaveClass(/active/);
  });
});

test.describe("Stripe color interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Stripes", exact: true }).click();
  });

  test("color pickers exist and are interactive", async ({ page }) => {
    const pickers = page.locator(".toolbar-color-picker");
    await expect(pickers).toHaveCount(3);
    const first = pickers.first();
    // Trigger input event by setting value
    await first.evaluate((el: HTMLInputElement) => {
      el.value = "#FF0000";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(first).toHaveValue("#ff0000");
  });
});
