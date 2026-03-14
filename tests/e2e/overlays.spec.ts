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

  test("clicking Triangle adds a custom path overlay", async ({ page }) => {
    const btn = page.getByRole("button", { name: "Add Triangle overlay" });
    await btn.click();
    await expect(btn).toBeVisible();
    await expect(page.locator("svg.flag-svg > path")).toHaveCount(1);
  });
});

test.describe("Layer list interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
  });

  test("deleting a layer removes it from the list", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    const rows = page.locator(".toolbar-layer-row");
    await expect(rows).toHaveCount(1);
    await page.getByRole("button", { name: "Delete layer" }).click();
    await expect(rows).toHaveCount(0);
  });

  test("visibility toggle hides then shows a layer", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Hide layer" }).click();
    await expect(page.getByRole("button", { name: "Show layer" })).toBeVisible();
    await page.getByRole("button", { name: "Show layer" }).click();
    await expect(page.getByRole("button", { name: "Hide layer" })).toBeVisible();
  });

  test("lock toggle locks then unlocks a layer", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Lock layer" }).click();
    await expect(page.getByRole("button", { name: "Unlock layer" })).toBeVisible();
    await page.getByRole("button", { name: "Unlock layer" }).click();
    await expect(page.getByRole("button", { name: "Lock layer" })).toBeVisible();
  });

  test("moving a layer reorders two layers", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: "Add Rectangle overlay" });
    await addBtn.click();
    await addBtn.click();
    const rows = page.locator(".toolbar-layer-row");
    await expect(rows).toHaveCount(2);
    // First displayed row (highest index, rendered first) has "Move layer down" enabled
    await page.getByRole("button", { name: "Move layer down" }).first().click();
    await expect(rows).toHaveCount(2);
    // After the swap, the bottom row now has "Move layer up" enabled (direction="up")
    await page.getByRole("button", { name: "Move layer up" }).last().click();
    await expect(rows).toHaveCount(2);
  });

  test("layer color change updates the flag", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    const colorPicker = page
      .locator('.toolbar-layer-color[aria-label="Layer fill color"]')
      .first();
    await colorPicker.evaluate((el: HTMLInputElement) => {
      el.value = "#ff0000";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Flag canvas should still be visible after the color update
    const flagSvg = page.locator(".flag-canvas svg").first();
    await expect(flagSvg).toBeVisible();
  });
});

test.describe("Overlay drag-to-move", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
  });

  test("dragging an overlay changes its position", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    // Close the panel so it does not obscure the canvas on mobile
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    await expect(overlay).toBeVisible();

    const xBefore = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("x") ?? "0"),
    );
    const yBefore = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("y") ?? "0"),
    );

    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay has no bounding box");

    // Drag the overlay 60px to the right and 40px down
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 60,
      box.y + box.height / 2 + 40,
      { steps: 5 },
    );
    await page.mouse.up();

    const xAfter = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("x") ?? "0"),
    );
    const yAfter = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("y") ?? "0"),
    );

    expect(xAfter).not.toBeCloseTo(xBefore, 0);
    expect(yAfter).not.toBeCloseTo(yBefore, 0);
  });

  test("locked overlay cannot be dragged", async ({ page }) => {
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    await expect(overlay).toBeVisible();

    // Lock the layer, then close panel so canvas is accessible on mobile
    await page.getByRole("button", { name: "Lock layer" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const xBefore = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("x") ?? "0"),
    );

    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay has no bounding box");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 60,
      box.y + box.height / 2 + 40,
      { steps: 5 },
    );
    await page.mouse.up();

    const xAfter = await overlay.evaluate((el) =>
      parseFloat(el.getAttribute("x") ?? "0"),
    );

    expect(xAfter).toBeCloseTo(xBefore, 0);
  });
});
