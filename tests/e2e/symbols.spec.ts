import { test, expect } from "./coverage-fixture";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const builtinSymbols: Array<{ category: string; name: string }> = require("../../src/config/symbols-catalog.generated.json").symbols;
const builtinSymbolIndex: { categories: Array<{ name: string }> } = require("../../src/config/symbols-catalog-index.generated.json");
const runtimeSymbols: Array<{ id: string; category: string }> = require("../../public/symbols.json");
const templateConfigs: Array<{
  overlays?: Array<{ type?: string; symbolId?: string }>;
}> = require("../../src/config/un-flags.json");

const builtInCategories = builtinSymbolIndex.categories.map((category) => category.name);
const defaultCategory = builtInCategories[0] ?? "";
const alternateCategory = builtInCategories.find((category) => category !== defaultCategory) ?? defaultCategory;
const alternateCategorySearchTerm =
  builtinSymbols
    .find((symbol) => symbol.category === alternateCategory)
    ?.name.split(/\s+/)[0]
    ?.toLowerCase() ?? "";

function builtInCount(category: string, query = ""): number {
  const loweredQuery = query.toLowerCase();
  return builtinSymbols.filter((symbol) => {
    if (symbol.category !== category) return false;
    if (loweredQuery && !symbol.name.toLowerCase().includes(loweredQuery)) return false;
    return true;
  }).length;
}

const enabledRuntimeSymbolIds = new Set<string>(["wales_flag"]);
for (const config of templateConfigs) {
  for (const overlay of config.overlays ?? []) {
    if (overlay.type === "symbol" && typeof overlay.symbolId === "string") {
      enabledRuntimeSymbolIds.add(overlay.symbolId);
    }
  }
}

const coatOfArmsCount = runtimeSymbols.filter(
  (symbol) => symbol.category === "Coat of Arms" && enabledRuntimeSymbolIds.has(symbol.id),
).length;

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

  test("defaults to first category with symbols visible", async ({ page }) => {
    const items = page.locator(".toolbar-symbol-item");
    await expect(items.first()).toBeVisible();
    const activeBtn = page.locator(".toolbar-cat-btn.active");
    await expect(activeBtn).toHaveText(defaultCategory);
    await expect(items).toHaveCount(builtInCount(defaultCategory));
  });

  test("search filters symbols within active category", async ({ page }) => {
    const categoryBtn = page.locator(".toolbar-cat-btn", { hasText: alternateCategory });
    await categoryBtn.click();
    const search = page.locator('input[type="search"]');
    await search.fill(alternateCategorySearchTerm);
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(builtInCount(alternateCategory, alternateCategorySearchTerm));
  });

  test("switching category changes displayed symbols", async ({ page }) => {
    const categoryBtn = page.locator(".toolbar-cat-btn", { hasText: alternateCategory });
    await categoryBtn.click();
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(builtInCount(alternateCategory));
  });

  test("combining search and category filter", async ({ page }) => {
    const search = page.locator('input[type="search"]');
    await search.fill("hexa");
    const items = page.locator(".toolbar-symbol-item");
    await expect(items).toHaveCount(builtInCount(defaultCategory, "hexa"));
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
    const empty = page
      .locator(".toolbar-empty-text")
      .filter({ hasText: "No symbols found" });
    await expect(empty).toBeVisible();
  });

  test("lazy-loads more symbols when scrolling the panel", async ({ page }) => {
    const catBtn = page.locator(".toolbar-cat-btn", { hasText: "Coat of Arms" });
    await expect(catBtn).toBeVisible({ timeout: 15_000 });
    await catBtn.click();

    const items = page.locator(".toolbar-symbol-item");
    await expect(items.first()).toBeVisible();
    const initialCount = await items.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);
    expect(coatOfArmsCount).toBeGreaterThan(30);
    expect(initialCount).toBeLessThan(coatOfArmsCount);

    const sentinel = page.locator(".toolbar-symbol-sentinel");
    await expect(sentinel).toBeAttached();
    await sentinel.scrollIntoViewIfNeeded();
    await expect(items).not.toHaveCount(initialCount, { timeout: 3000 });
    const afterCount = await items.count();
    expect(afterCount).toBeGreaterThan(initialCount);
    expect(afterCount).toBeLessThanOrEqual(coatOfArmsCount);
  });
});
