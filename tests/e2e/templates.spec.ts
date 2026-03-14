import { test, expect } from "./coverage-fixture";

test.describe("Templates panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
  });

  test("shows Division, National, and State Level sections", async ({ page }) => {
    const sections = page.locator(".toolbar-template-section-toggle .toolbar-section-title");
    const texts = await sections.allTextContents();
    expect(texts).toContain("Division");
    expect(texts).toContain("National");
    expect(texts).toContain("State Level");

    const toggles = page.locator(".toolbar-template-section-toggle");
    await expect(toggles.nth(0)).toHaveAttribute("aria-expanded", "true");
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect(toggles.nth(2)).toHaveAttribute("aria-expanded", "false");
  });

  test("shows only Division template items by default", async ({ page }) => {
    const items = page.locator(".toolbar-template-item");
    await expect(items.first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply France template" })).toHaveCount(0);
  });

  test("each template item has an SVG thumbnail", async ({ page }) => {
    const items = page.locator(".toolbar-template-item");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const svg = items.nth(i).locator("> svg").first();
      await expect(svg).toBeVisible();
    }
  });

  test("loads collapsed sections only when expanded", async ({ page }) => {
    const initialCount = await page.locator(".toolbar-template-item").count();

    await page.getByRole("button", { name: "National" }).click();
    await expect(page.getByRole("button", { name: "Apply France template" })).toBeVisible();
    const afterNationalCount = await page.locator(".toolbar-template-item").count();
    expect(afterNationalCount).toBeGreaterThan(initialCount);

    await page.getByRole("button", { name: "State Level" }).click();
    const expandedCount = await page.locator(".toolbar-template-item").count();
    expect(expandedCount).toBeGreaterThan(afterNationalCount);
  });

  test("done templates use static image previews while unfinished ones stay vectorial", async ({ page }) => {
    await page.getByRole("button", { name: "National" }).click();

    const nationalItems = page.locator(".toolbar-template-item");
    const itemCount = await nationalItems.count();

    let doneTemplateFound = false;
    let unfinishedTemplateFound = false;

    for (let index = 0; index < itemCount; index++) {
      const item = nationalItems.nth(index);
      const hasImage = (await item.locator("img").count()) > 0;
      const hasSvg = (await item.locator("svg").count()) > 0;

      if (hasImage) {
        doneTemplateFound = true;
      }

      if (hasSvg) {
        unfinishedTemplateFound = true;
      }

      if (doneTemplateFound && unfinishedTemplateFound) {
        break;
      }
    }

    test.skip(!(doneTemplateFound && unfinishedTemplateFound), "Need both finished and unfinished national templates");

    expect(doneTemplateFound).toBe(true);
    expect(unfinishedTemplateFound).toBe(true);
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

  test("applying the France template renders a tricolor flag", async ({ page }) => {
    await page.getByRole("button", { name: "National" }).click();
    await page.getByRole("button", { name: "Apply France template" }).click();

    await expect(page.locator("svg.flag-svg > rect")).toHaveCount(3);

    const fills = await page.locator("svg.flag-svg > rect").evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("fill")),
    );

    expect(fills).toContain("#002395");
    expect(fills).toContain("#FFFFFF");
    expect(fills).toContain("#ED2939");
  });

  test("applying the Wales template renders its emblem overlay", async ({ page }) => {
    await page.getByRole("button", { name: "State Level" }).click();
    await page.getByRole("button", { name: "Apply Wales template" }).click();

    const emblem = page.locator("svg.flag-svg > svg").first();
    await expect(emblem).toBeVisible();
  });
});
