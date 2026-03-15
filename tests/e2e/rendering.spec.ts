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
      id: "rot-tri",
      type: "custom",
      x: 25,
      y: 75,
      w: 18,
      h: 18,
      rotation: 25,
      fill: "#ff3355",
      stroke: "#0000",
      strokeWidth: 0,
      opacity: 1,
      path: "M 50 30 L 30 70 L 70 70 Z",
    },
    {
      id: "rot-symbol",
      type: "symbol",
      symbolId: "sol_de_mayo",
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
    // Open the Aspect Ratio tab; on mobile this also opens the panel.
    await page.getByRole("button", { name: "Aspect Ratio", exact: true }).click();
    if (viewport && viewport.width < 1280) {
      await expect(page.locator(".toolbar-panel")).toHaveClass(/panel-open/);
    }
    await page.getByRole("button", { name: "Set ratio to 1:1" }).click();
    await expect(page.locator("svg.flag-svg")).toHaveAttribute("viewBox", "0 0 1200 1200");
  });

  test("renders a rectangle overlay in the main SVG", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await expect(page.locator("svg.flag-svg > rect")).toHaveCount(3);
  });

  test("renders a circle overlay as an ellipse", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Circle overlay" }).click();
    await expect(page.locator("svg.flag-svg > ellipse")).toHaveCount(1);
  });

  test("renders a triangle overlay as a path", async ({ page }) => {
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Triangle overlay" }).click();
    await expect(page.locator("svg.flag-svg > path")).toHaveCount(1);
  });

  test("renders a generated symbol overlay inside a nested SVG", async ({ page }) => {
    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(
        new CustomEvent("toolbar:symbol", {
          detail: { symbolId: "star_five_pointed" },
          bubbles: true,
        }),
      );
    });
    await expect(page.locator("svg.flag-svg > svg")).toHaveCount(1);
    await expect(page.locator("svg.flag-svg > svg path")).toHaveCount(1);
  });

  test("renders an svg-backed symbol overlay inside a nested SVG", async ({ page }) => {
    await page.getByRole("button", { name: "Symbols", exact: true }).click();
    await page.getByRole("button", { name: "Celestial", exact: true }).click();
    await page.getByRole("button", { name: "Add Sol de Mayo" }).click();
    await expect(page.locator("svg.flag-svg > svg")).toHaveCount(1);
  });

  test("renders custom and symbol overlays from templates", async ({ page }) => {
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await page.getByRole("button", { name: "National" }).click();
    await page.getByRole("button", { name: "Apply South Africa template" }).click();
    await expect(page.locator("svg.flag-svg > path")).toHaveCount(1);

    await page.getByRole("button", { name: "Apply Uruguay template" }).click();
    await expect(page.locator("svg.flag-svg > svg")).toHaveCount(1);
  });

  test("renders a subdivision template that lazy-loads a large emblem shard", async ({ page }) => {
    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await page.getByRole("button", { name: "State Level" }).click();
    await page.getByRole("button", { name: "Apply Saxony-Anhalt template" }).click();

    const metrics = await page.locator("svg.flag-svg").evaluate((root) => {
      const nestedSvgs = Array.from(root.querySelectorAll("svg"));
      const nestedLengths = nestedSvgs.map((node) => node.innerHTML.length);
      return {
        nestedSvgCount: nestedSvgs.length,
        maxNestedInnerLength: nestedLengths.length ? Math.max(...nestedLengths) : 0,
        viewBox: root.getAttribute("viewBox"),
      };
    });

    expect(metrics.viewBox).toBeTruthy();
    expect(metrics.nestedSvgCount).toBeGreaterThanOrEqual(1);
    // innerHTML length is an indirect proxy for shard loading: a loaded,
    // non-trivial emblem will produce several KB of markup. The test cannot
    // directly verify lazy loading timing (the category may have been
    // pre-loaded by an earlier test), but it confirms the emblem actually
    // rendered rather than falling back to a placeholder.
    expect(metrics.maxNestedInnerLength).toBeGreaterThanOrEqual(10000);
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

  test("preserves grid overlay when adding an overlay while grid is active", async ({ page }) => {
    // Activate grid
    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click();
    await expect(page.locator(".grid-overlay")).toBeAttached();

    // Add an overlay while grid is visible (triggers redraw with active grid)
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();

    // Both overlay and grid should be present
    await expect(page.locator("svg.flag-svg > rect")).toHaveCount(3);
    await expect(page.locator(".grid-overlay")).toBeAttached();
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