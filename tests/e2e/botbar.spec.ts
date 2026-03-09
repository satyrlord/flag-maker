import { ZOOM_MIN } from "../../src/ui/botbar";
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

    const transform = await page.locator(".flag-wrap").evaluate(
      (el) => (el as HTMLElement).style.transform,
    );
    expect(transform).toBe("scale(0.9)");
  });

  test("wheel zoom updates the level display without allowing enlargement", async ({ page }) => {
    const canvas = page.locator("main.flag-canvas");
    await canvas.hover();
    await page.mouse.wheel(0, 120);
    // Exact zoom step varies by platform; just verify it decreased from 100%
    const botbar = page.getByRole("toolbar", { name: "Zoom Level" });
    await expect(botbar).not.toContainText("100%");
    const text = await botbar.textContent();
    const match = text?.match(/(\d+)%/);
    expect(match).not.toBeNull();
    const level = Number(match![1]);
    expect(level).toBeLessThan(100);
    expect(level).toBeGreaterThanOrEqual(90);

    // Scroll back up to 100%
    await page.mouse.wheel(0, -120);
    await expect(botbar).toContainText("100%");
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
    const botbar = page.getByRole("toolbar", { name: "Zoom Level" });
    await canvas.evaluate((element) => {
      for (let index = 0; index < 5; index += 1) {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true }));
      }
    });
    // 5 zoom-out events: verify we zoomed out noticeably
    await expect(botbar).not.toContainText("100%");
    const text = await botbar.textContent();
    const match = text?.match(/(\d+)%/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThan(100);

    await canvas.evaluate((element) => {
      for (let index = 0; index < 150; index += 1) {
        element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true }));
      }
    });
    await expect(page.getByRole("toolbar", { name: "Zoom Level" })).toContainText(`${ZOOM_MIN}%`);
    await expect(page.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });
});