import { test, expect } from "./coverage-fixture";

/* ── Fixture: overlay config for the rotated/stroked overlay test ── */
const ROTATED_OVERLAYS_CONFIG = {
  orientation: "horizontal",
  ratio: [1, 1],
  sections: 1,
  colors: ["#224466"],
  overlays: [
    {
      id: "rot-rect",
      type: "rectangle",
      x: 25,
      y: 25,
      w: 20,
      h: 16,
      rotation: 15,
      fill: "#ffffff",
      stroke: "#111111",
      strokeWidth: 4,
      opacity: 1,
    },
    {
      id: "rot-circle",
      type: "circle",
      x: 75,
      y: 25,
      w: 18,
      h: 18,
      rotation: 20,
      fill: "#ffee00",
      stroke: "#0000",
      strokeWidth: 0,
      opacity: 1,
    },
    {
      id: "rot-star",
      type: "star",
      x: 25,
      y: 75,
      w: 18,
      h: 18,
      rotation: 25,
      fill: "#ff3355",
      stroke: "#0000",
      strokeWidth: 0,
      opacity: 1,
    },
    {
      id: "rot-symbol",
      type: "symbol",
      symbolId: "greek_cross",
      x: 75,
      y: 75,
      w: 20,
      h: 20,
      rotation: 30,
      fill: "#ffffff",
      stroke: "#0000",
      strokeWidth: 0,
      opacity: 1,
    },
  ],
};

test.describe("Flag rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("updates the SVG viewBox when the ratio changes", async ({ page, viewport }) => {
    if (viewport && viewport.width < 1280) {
      await page.getByRole("button", { name: "Ratio", exact: true }).click();
    }
    await page.getByRole("button", { name: "Set ratio to 1:1" }).click();
    await expect(page.locator("svg.flag-svg")).toHaveAttribute("viewBox", "0 0 1200 1200");
  });

  test("renders a rectangle overlay in the main SVG", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await expect(page.locator("svg.flag-svg > rect")).toHaveCount(4);
  });

  test("renders a circle overlay as an ellipse", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Circle overlay" }).click();
    await expect(page.locator("svg.flag-svg > ellipse")).toHaveCount(1);
  });

  test("renders a star overlay as a path", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Star overlay" }).click();
    await expect(page.locator("svg.flag-svg > path")).toHaveCount(1);
  });

  test("renders a generated symbol overlay inside a nested SVG", async ({ page }) => {
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
    await page.getByRole("button", { name: "Add Star (5‑point)" }).click();
    await expect(page.locator("svg.flag-svg > svg")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > svg path")).toHaveCount(1);
  });

  test("renders a path-backed symbol overlay inside a nested SVG", async ({ page }) => {
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
    await page.getByRole("button", { name: "Add Greek Cross" }).click();
    await expect(page.locator("svg.flag-svg > svg path")).toHaveCount(1);
  });

  test("renders custom and symbol overlays from templates", async ({ page }) => {
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await page.getByRole("button", { name: "Apply South Africa template" }).click();
    await expect(page.locator("svg.flag-svg > path")).toHaveCount(1);

    await page.getByRole("button", { name: "Apply Uruguay template" }).click();
    await expect(page.locator("svg.flag-svg > svg")).toHaveCount(1);
  });

  test("renders rotated and stroked overlays from a custom template event", async ({ page }) => {
    await page.locator("#root").evaluate((root, cfg) => {
      root.dispatchEvent(
        new CustomEvent("toolbar:template", {
          detail: { id: "coverage-template", config: cfg },
          bubbles: true,
        }),
      );
    }, ROTATED_OVERLAYS_CONFIG);

    await expect(page.locator("svg.flag-svg > rect[transform]")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > ellipse[transform]")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > path[transform]")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > svg[transform]")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > rect[stroke]")).toHaveCount(1);
  });

  test("renders a registered symbol that provides raw SVG markup", async ({ page }) => {
    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("symbols:register", {
          detail: {
            defs: [
              {
                id: "coverage-emblem",
                name: "Coverage Emblem",
                category: "Test",
                viewBox: "0 0 10 10",
                svg: '<circle cx="5" cy="5" r="4" fill="currentColor"></circle>',
              },
            ],
          },
          bubbles: true,
        }),
      );
      root.dispatchEvent(
        new CustomEvent("toolbar:symbol", {
          detail: { symbolId: "coverage-emblem" },
          bubbles: true,
        }),
      );
    });

    await expect(page.locator("svg.flag-svg > svg circle")).toHaveCount(1);
  });
});