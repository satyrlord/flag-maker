import { test, expect } from "./coverage-fixture";
import type { Page } from "@playwright/test";

type EmblemCase = {
  name: string;
  minPathCount?: number;
  minUseCount?: number;
  minNestedSvgCount?: number;
  minNestedInnerLength?: number;
};

type FlagMetrics = {
  rootViewBox: string | null;
  pathCount: number;
  useCount: number;
  nestedSvgCount: number;
  maxNestedInnerLength: number;
};

const NATIONAL_EMBLEM_CASES: EmblemCase[] = [
  { name: "American Samoa", minPathCount: 60 },
  { name: "Andorra", minPathCount: 100, minUseCount: 10 },
  { name: "Anguilla", minNestedSvgCount: 1, minNestedInnerLength: 3000 },
  { name: "Belarus", minPathCount: 4, minUseCount: 2 },
  { name: "Brazil", minPathCount: 5, minUseCount: 50 },
  { name: "South Korea", minPathCount: 4, minNestedSvgCount: 4 },
];

const SUBDIVISION_EMBLEM_CASES: EmblemCase[] = [
  { name: "Wales", minPathCount: 20 },
  { name: "Northern Ireland", minPathCount: 100, minUseCount: 1 },
  { name: "Sardinia", minPathCount: 10, minUseCount: 40 },
  { name: "Corsica", minPathCount: 30 },
  { name: "Berlin", minNestedSvgCount: 1, minNestedInnerLength: 2000 },
  { name: "Saxony-Anhalt", minNestedSvgCount: 1, minNestedInnerLength: 10000 },
  { name: "Venice", minNestedSvgCount: 1, minNestedInnerLength: 20000 },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureTemplatesPanelVisible(page: Page): Promise<void> {
  const sectionToggle = page.locator(".toolbar-template-section-toggle").first();
  if (await sectionToggle.isVisible()) {
    return;
  }

  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await expect(sectionToggle).toBeVisible();
}

async function ensureSectionOpen(
  page: Page,
  sectionName: string,
): Promise<void> {
  await ensureTemplatesPanelVisible(page);

  const toggle = page.getByRole("button", { name: new RegExp(`^${escapeRegex(sectionName)}$`) });
  await toggle.scrollIntoViewIfNeeded();

  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function applyTemplate(
  page: Page,
  sectionName: string,
  templateName: string,
): Promise<void> {
  await ensureSectionOpen(page, sectionName);
  const button = page.getByRole("button", { name: `Apply ${templateName} template` });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.locator("svg.flag-svg")).toBeVisible();
  await page.waitForTimeout(200);
}

async function collectFlagMetrics(page: Page): Promise<FlagMetrics> {
  return page.locator("svg.flag-svg").evaluate((root: SVGSVGElement) => {
    const nestedSvgs = Array.from(root.querySelectorAll<SVGSVGElement>("svg"));
    const nestedLengths = nestedSvgs.map((node) => node.innerHTML.length);
    return {
      rootViewBox: root.getAttribute("viewBox"),
      pathCount: root.querySelectorAll("path").length,
      useCount: root.querySelectorAll("use").length,
      nestedSvgCount: nestedSvgs.length,
      maxNestedInnerLength: nestedLengths.length ? Math.max(...nestedLengths) : 0,
    };
  });
}

function assertEmblemMetrics(metrics: FlagMetrics, emblemCase: EmblemCase): void {
  expect(metrics.rootViewBox, `${emblemCase.name} should render a viewBox`).toBeTruthy();

  if (typeof emblemCase.minPathCount === "number") {
    expect(metrics.pathCount, `${emblemCase.name} path count`).toBeGreaterThanOrEqual(emblemCase.minPathCount);
  }

  if (typeof emblemCase.minUseCount === "number") {
    expect(metrics.useCount, `${emblemCase.name} use count`).toBeGreaterThanOrEqual(emblemCase.minUseCount);
  }

  if (typeof emblemCase.minNestedSvgCount === "number") {
    expect(metrics.nestedSvgCount, `${emblemCase.name} nested svg count`).toBeGreaterThanOrEqual(emblemCase.minNestedSvgCount);
  }

  if (typeof emblemCase.minNestedInnerLength === "number") {
    expect(metrics.maxNestedInnerLength, `${emblemCase.name} nested svg payload`).toBeGreaterThanOrEqual(emblemCase.minNestedInnerLength);
  }
}

async function runEmblemSweep(
  page: Page,
  sectionName: string,
  emblemCases: EmblemCase[],
): Promise<void> {
  // Steps run serially because each applyTemplate() call mutates shared page
  // state (the rendered flag). Parallel execution with Promise.all would cause
  // race conditions since all steps share a single browser page.
  for (const emblemCase of emblemCases) {
    await test.step(`${sectionName}: ${emblemCase.name}`, async () => {
      await applyTemplate(page, sectionName, emblemCase.name);
      const metrics = await collectFlagMetrics(page);
      assertEmblemMetrics(metrics, emblemCase);
    });
  }
}

test.describe("Emblem-heavy template regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Templates", exact: true }).click();
  });

  test("renders emblem-heavy national templates after lazy symbol loading", async ({ page }) => {
    test.slow();
    await runEmblemSweep(page, "National", NATIONAL_EMBLEM_CASES);
  });

  test("renders emblem-heavy subdivision templates after lazy symbol loading", async ({ page }) => {
    test.slow();
    await runEmblemSweep(page, "State Level", SUBDIVISION_EMBLEM_CASES);
  });
});