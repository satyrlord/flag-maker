import { test, expect } from "./coverage-fixture";

test.describe("Zoom Level (botbar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("shows default zoom state with zoom-in disabled", async ({ page }) => {
    const botbar = page.getByRole("toolbar", { name: "Zoom Level" });
    await expect(botbar).toBeVisible();
    await expect(botbar).toContainText("100%");
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  test("zoom out updates the SVG scale and re-enables zoom in", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("90%");
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeEnabled();

    const transform = await page.locator("svg.flag-svg").evaluate(
      (el) => (el as SVGSVGElement).style.transform,
    );
    expect(transform).toBe("scale(0.9)");
  });

  test("wheel zoom updates the level display without allowing enlargement", async ({ page }) => {
    const canvas = page.locator("main.flag-canvas");
    await canvas.hover();
    await page.mouse.wheel(0, 120);
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("99%");

    await page.mouse.wheel(0, -120);
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("100%");
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  test("wheel zoom at 100 percent does not exceed the cap", async ({ page }) => {
    const canvas = page.locator("main.flag-canvas");
    await canvas.hover();
    await page.mouse.wheel(0, -120);
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("100%");
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  test("wheel zoom accumulates across multiple events and clamps at the minimum", async ({ page }) => {
    const canvas = page.locator("main.flag-canvas");
    await canvas.evaluate((element) => {
      for (let index = 0; index < 5; index += 1) {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true }));
      }
    });
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("95%");

    await canvas.evaluate((element) => {
      for (let index = 0; index < 150; index += 1) {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true }));
      }
    });
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText("2%");
    await expect(page.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });
});

test.describe("Dynamic Tools (rightbar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("is hidden by default", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    await expect(rightbar).toBeAttached();
    await expect(rightbar).not.toHaveClass(/rightbar-visible/);
  });

  test("responds to visibility events", async ({ page }) => {
    const rightbar = page.getByRole("toolbar", { name: "Dynamic Tools" });
    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("rightbar:visibility", {
          detail: { visible: true },
          bubbles: true,
        }),
      );
    });
    await expect(rightbar).toHaveClass(/rightbar-visible/);

    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("rightbar:visibility", {
          detail: { visible: false },
          bubbles: true,
        }),
      );
    });
    await expect(rightbar).not.toHaveClass(/rightbar-visible/);
  });
});