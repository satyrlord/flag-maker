import { test, expect } from "./coverage-fixture";

type OverlaySnapshot = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  fill: string;
  symbolId?: string;
  starDistribution?: string;
  starCount?: number;
  starCols?: number;
  starRotateWithPosition?: boolean;
};

type DesignSnapshot = {
  orientation: string;
  ratio: [number, number];
  sections: number;
  weights: number[];
  colors: string[];
  overlays: OverlaySnapshot[];
};

async function gotoWithHooks(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/?e2e-hooks=1");
  await page.waitForLoadState("domcontentloaded");
}

async function getDesignSnapshot(page: import("@playwright/test").Page): Promise<DesignSnapshot> {
  return page.evaluate(() => {
    const hooks = (window as Window & {
      __FLAG_MAKER_TEST_HOOKS__?: { getDesignSnapshot?: () => DesignSnapshot };
    }).__FLAG_MAKER_TEST_HOOKS__;
    if (!hooks?.getDesignSnapshot) {
      throw new Error("Missing getDesignSnapshot hook");
    }
    return hooks.getDesignSnapshot();
  });
}

test.describe("Targeted browser coverage", () => {
  test("validator hook exercises leftbar config error branches", async ({ page }) => {
    await gotoWithHooks(page);

    const messages = await page.evaluate(() => {
      const hooks = (window as Window & {
        __FLAG_MAKER_TEST_HOOKS__?: {
          getLeftbarConfig?: () => Record<string, unknown>;
          validateLeftbarConfig?: (cfg: Record<string, unknown>) => void;
        };
      }).__FLAG_MAKER_TEST_HOOKS__;
      if (!hooks?.getLeftbarConfig || !hooks.validateLeftbarConfig) {
        throw new Error("Missing leftbar config hooks");
      }

      const scenarios = [
        (cfg: Record<string, unknown>) => {
          cfg.ratios = [];
        },
        (cfg: Record<string, unknown>) => {
          cfg.ratios = [{ label: "1:1", ratio: [1, 1], commonality: 1 }, { label: "1:1", ratio: [2, 3], commonality: 1 }];
        },
        (cfg: Record<string, unknown>) => {
          cfg.defaultRatio = "9:9";
        },
        (cfg: Record<string, unknown>) => {
          cfg.defaultRatio = "1-2";
          cfg.ratios = [{ label: "1-2", ratio: [1, 2], commonality: 1 }];
        },
        (cfg: Record<string, unknown>) => {
          cfg.supportedOverlayTypes = [];
        },
        (cfg: Record<string, unknown>) => {
          cfg.supportedOverlayTypes = ["rectangle", "rectangle", "circle", "triangle", "custom", "symbol", "starfield"];
        },
        (cfg: Record<string, unknown>) => {
          cfg.defaultOrientation = "diagonal";
        },
        (cfg: Record<string, unknown>) => {
          cfg.defaultOverlayFill = "red";
        },
        (cfg: Record<string, unknown>) => {
          (cfg.stripes as { defaultColors: string[] }).defaultColors = ["#000000"];
        },
        (cfg: Record<string, unknown>) => {
          cfg.layerGroupOrder = ["stripes"];
        },
      ];

      return scenarios.map((mutate) => {
        const cfg = hooks.getLeftbarConfig?.() ?? {};
        mutate(cfg);
        try {
          hooks.validateLeftbarConfig?.(cfg);
          return "no error";
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      });
    });

    expect(messages[0]).toContain("ratios must not be empty");
    expect(messages[1]).toContain("ratio labels must be unique");
    expect(messages[2]).toContain("defaultRatio \"9:9\" is not defined");
    expect(messages[3]).toContain("defaultRatio \"1-2\" must be \"N:M\"");
    expect(messages[4]).toContain("supportedOverlayTypes must not be empty");
    expect(messages[5]).toContain("supportedOverlayTypes must be unique");
    expect(messages[6]).toContain("defaultOrientation \"diagonal\"");
    expect(messages[7]).toContain("defaultOverlayFill \"red\"");
    expect(messages[8]).toContain("defaultColors must cover maxCount");
    expect(messages[9]).toContain("layerGroupOrder must contain exactly");
  });

  test("leftbar hooks cover thumbnail branches for vertical, rotated, custom, and symbol overlays", async ({ page }) => {
    await gotoWithHooks(page);

    const thumbnailResults = await page.evaluate(() => {
      const hooks = (window as Window & {
        __FLAG_MAKER_TEST_HOOKS__?: {
          renderPanelHeaderMarkup?: (text: string, tabId: string) => string;
          renderTemplateThumbnailMarkup?: (cfg: Record<string, unknown>, symbols?: Array<Record<string, unknown>>) => string;
        };
      }).__FLAG_MAKER_TEST_HOOKS__;
      if (!hooks?.renderPanelHeaderMarkup || !hooks.renderTemplateThumbnailMarkup) {
        throw new Error("Missing leftbar rendering hooks");
      }

      const headerWithoutIcon = hooks.renderPanelHeaderMarkup("Test", "unknown");
      const thumbnailMarkup = hooks.renderTemplateThumbnailMarkup(
        {
          ratio: [2, 3],
          orientation: "vertical",
          sections: 2,
          colors: ["#111111", "#eeeeee"],
          overlays: [
            { type: "rectangle", x: 50, y: 50, w: 30, h: 20, rotation: 30, fill: "#ff0000" },
            { type: "custom", path: "M10 10 L90 10 L50 90 Z", fill: "#00ff00" },
            { type: "symbol", symbolId: "svg-symbol", x: 20, y: 20, w: 15, h: 15, rotation: 15, fill: "#ffffff" },
            { type: "symbol", symbolId: "path-symbol", x: 50, y: 50, w: 15, h: 15, rotation: 25, fill: "#ffffff" },
            { type: "symbol", symbolId: "gen-symbol", x: 80, y: 80, w: 15, h: 15, fill: "#ffffff" },
          ],
        },
        [
          {
            id: "svg-symbol",
            name: "SVG",
            category: "Test",
            viewBox: "0 0 100 100",
            svg: "<circle cx='50' cy='50' r='40' fill='currentColor' />",
          },
          {
            id: "path-symbol",
            name: "Path",
            category: "Test",
            viewBox: "0 0 100 100",
            path: "M10 10 L90 10 L50 90 Z",
            fillRule: "evenodd",
          },
          { id: "gen-symbol", name: "Generated", category: "Test", generator: "star5" },
        ],
      );

      const probe = document.createElement("div");
      probe.innerHTML = thumbnailMarkup;
      const svgSymbolWrapper = probe.querySelector("circle")?.closest("svg");
      const pathSymbol = probe.querySelector("path[d='M10 10 L90 10 L50 90 Z'][fill='#ffffff']");

      return {
        headerWithoutIcon,
        thumbnailMarkup,
        svgSymbolStyle: svgSymbolWrapper?.getAttribute("style") ?? "",
        svgSymbolTransform: svgSymbolWrapper?.getAttribute("transform") ?? "",
        pathFillRule: pathSymbol?.getAttribute("fill-rule") ?? null,
      };
    });

    expect(thumbnailResults.headerWithoutIcon).not.toContain("toolbar-panel-icon");
    expect(thumbnailResults.thumbnailMarkup).toContain("rotate(30");
    expect(thumbnailResults.thumbnailMarkup).toContain("M10 10 L90 10 L50 90 Z");
    expect(thumbnailResults.thumbnailMarkup.match(/<svg/g)?.length ?? 0).toBeGreaterThan(3);
    expect(thumbnailResults.svgSymbolStyle).toContain("color: rgb(255, 255, 255)");
    expect(thumbnailResults.svgSymbolTransform).toContain("rotate(15");
    expect(thumbnailResults.pathFillRule).toBe("evenodd");

    await page.evaluate(() => {
      const hooks = (window as Window & {
        __FLAG_MAKER_TEST_HOOKS__?: { runLeftbarCoverageProbe?: () => boolean };
      }).__FLAG_MAKER_TEST_HOOKS__;
      if (!hooks?.runLeftbarCoverageProbe) {
        throw new Error("Missing leftbar coverage probe");
      }
      hooks.runLeftbarCoverageProbe();
    });
  });

  test("main coverage probe exercises defensive no-op branches", async ({ page }) => {
    await gotoWithHooks(page);
    const result = await page.evaluate(() => {
      const hooks = (window as Window & {
        __FLAG_MAKER_TEST_HOOKS__?: { runMainCoverageProbe?: () => boolean };
      }).__FLAG_MAKER_TEST_HOOKS__;
      if (!hooks?.runMainCoverageProbe) {
        throw new Error("Missing main coverage probe");
      }
      return hooks.runMainCoverageProbe();
    });

    expect(result).toBe(true);
  });

  test("dark flags auto-select cyan grid and keep the overlay visible", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Stripes", exact: true }).click();

    const pickers = page.locator(".toolbar-color-picker");
    const count = await pickers.count();
    for (let index = 0; index < count; index++) {
      await pickers.nth(index).evaluate((element: HTMLInputElement) => {
        element.value = "#000000";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    const gridBtn = page.getByRole("button", { name: "Toggle pixel grid" });
    await gridBtn.click();

    await expect(gridBtn).toHaveClass(/rightbar-btn-cyan/);
    await expect(page.locator(".grid-overlay")).toBeAttached();
  });

  test("reset restores the default design and clears selection", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay has no bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".bb-frame")).toBeVisible();

    await page.getByRole("button", { name: /reset flag/i }).click();

    const snapshot = await getDesignSnapshot(page);
    expect(snapshot.overlays).toHaveLength(0);
    await expect(page.locator(".bb-container")).toHaveCSS("display", "none");
    await expect(page.getByRole("button", { name: "Center horizontally" })).toBeDisabled();
  });

  test("selection enables centering tools and background clicks disable them again", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const centerH = page.getByRole("button", { name: "Center horizontally" });
    const centerV = page.getByRole("button", { name: "Center vertically" });
    await expect(centerH).toBeDisabled();
    await expect(centerV).toBeDisabled();

    await centerH.evaluate((element) => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay has no bounding box");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();

    const movedSnapshot = await getDesignSnapshot(page);
    expect(movedSnapshot.overlays[0].x).not.toBeCloseTo(50, 1);
    expect(movedSnapshot.overlays[0].y).not.toBeCloseTo(50, 1);

    const movedBox = await overlay.boundingBox();
    if (!movedBox) throw new Error("overlay has no bounding box after drag");
    await page.mouse.click(movedBox.x + movedBox.width / 2, movedBox.y + movedBox.height / 2);
    await expect(centerH).toBeEnabled();
    await expect(centerV).toBeEnabled();

    await centerH.click();
    await centerV.click();

    const centeredSnapshot = await getDesignSnapshot(page);
    expect(centeredSnapshot.overlays[0].x).toBeCloseTo(50, 3);
    expect(centeredSnapshot.overlays[0].y).toBeCloseTo(50, 3);

    await page.locator(".flag-wrap").evaluate((element) => {
      element.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      }));
    });
    await expect(centerH).toBeDisabled();
    await expect(centerV).toBeDisabled();
  });

  test("locked overlays ignore selection clicks", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Lock layer" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay has no bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const selectedId = await page.evaluate(() => {
      const hooks = (window as Window & {
        __FLAG_MAKER_TEST_HOOKS__?: { getSelectedOverlayId?: () => string | null };
      }).__FLAG_MAKER_TEST_HOOKS__;
      return hooks?.getSelectedOverlayId?.() ?? null;
    });

    expect(selectedId).toBeNull();
    await expect(page.getByRole("button", { name: "Center horizontally" })).toBeDisabled();
  });

  test("resizing east and north handles updates overlay dimensions", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const overlayBox = await overlay.boundingBox();
    if (!overlayBox) throw new Error("overlay has no bounding box");
    await page.mouse.click(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);

    const beforeResize = await getDesignSnapshot(page);
    const eastHandle = page.locator('.bb-frame [data-handle-id="e"]');
    const eastBox = await eastHandle.boundingBox();
    if (!eastBox) throw new Error("east handle has no bounding box");
    await page.mouse.move(eastBox.x + eastBox.width / 2, eastBox.y + eastBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(eastBox.x + eastBox.width / 2 + 50, eastBox.y + eastBox.height / 2, { steps: 4 });
    await page.mouse.up();

    const northHandle = page.locator('.bb-frame [data-handle-id="n"]');
    const northBox = await northHandle.boundingBox();
    if (!northBox) throw new Error("north handle has no bounding box");
    await page.mouse.move(northBox.x + northBox.width / 2, northBox.y + northBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(northBox.x + northBox.width / 2, northBox.y + northBox.height / 2 - 35, { steps: 4 });
    await page.mouse.up();

    const afterResize = await getDesignSnapshot(page);
    expect(afterResize.overlays[0].w).toBeGreaterThan(beforeResize.overlays[0].w);
    expect(afterResize.overlays[0].h).toBeGreaterThan(beforeResize.overlays[0].h);
  });

  test("pointer cancel during resize restores the original geometry", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const overlayBox = await overlay.boundingBox();
    if (!overlayBox) throw new Error("overlay has no bounding box");
    await page.mouse.click(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);

    const beforeResize = await getDesignSnapshot(page);
    const eastHandle = page.locator('.bb-frame [data-handle-id="e"]');
    const eastBox = await eastHandle.boundingBox();
    if (!eastBox) throw new Error("east handle has no bounding box");

    await page.mouse.move(eastBox.x + eastBox.width / 2, eastBox.y + eastBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(eastBox.x + eastBox.width / 2 + 45, eastBox.y + eastBox.height / 2, { steps: 4 });
    await page.locator(".bb-frame").evaluate((element) => {
      element.dispatchEvent(new PointerEvent("pointercancel", {
        bubbles: true,
        pointerId: 1,
      }));
    });
    await page.mouse.up();

    const afterCancel = await getDesignSnapshot(page);
    expect(afterCancel.overlays[0].w).toBeCloseTo(beforeResize.overlays[0].w, 3);
    expect(afterCancel.overlays[0].h).toBeCloseTo(beforeResize.overlays[0].h, 3);
    expect(afterCancel.overlays[0].x).toBeCloseTo(beforeResize.overlays[0].x, 3);
  });

  test("registering symbol definitions through the root event keeps the app interactive", async ({ page }) => {
    await gotoWithHooks(page);
    await page.locator("#root").evaluate((root) => {
      root.dispatchEvent(new CustomEvent("symbols:register", {
        detail: {
          defs: [{
            id: "runtime-symbol",
            name: "Runtime Symbol",
            category: "Test",
            viewBox: "0 0 100 100",
            path: "M10 10 L90 10 L50 90 Z",
          }],
        },
        bubbles: true,
      }));
    });

    await page.getByRole("button", { name: "Symbols", exact: true }).click();
    await expect(page.locator(".toolbar-symbol-item").first()).toBeVisible();
  });

  test("starfield controls update overlay properties and summary counts", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Starfield", exact: true }).click();
    await page.getByRole("button", { name: "Add starfield overlay" }).click();

    await expect(page.locator('.rightbar-layer-row[title^="starfields: 1/"]')).toBeVisible();

    const distribution = page.getByLabel("Star distribution pattern");
    await distribution.selectOption("grid");
    await expect(page.locator(".toolbar-starfield-cols")).toBeVisible();

    await page.getByRole("button", { name: "Increase column count" }).click();
    await page.getByRole("button", { name: "Increase star count" }).click();
    await page.getByLabel("Rotate stars with position").check();

    await distribution.selectOption("arc");
    await expect(page.locator(".toolbar-starfield-cols")).toHaveCSS("display", "none");

    await page.getByLabel("Star fill color").evaluate((element: HTMLInputElement) => {
      element.value = "#00ff00";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const snapshot = await getDesignSnapshot(page);
    const starfield = snapshot.overlays.find((overlay) => overlay.type === "starfield");
    expect(starfield).toBeDefined();
    expect(starfield?.starDistribution).toBe("arc");
    expect(starfield?.starCount).toBeGreaterThan(12);
    expect(starfield?.starCols).toBeGreaterThan(6);
    expect(starfield?.starRotateWithPosition).toBe(true);
    expect(starfield?.fill).toBe("#00ff00");
  });

  test("adding a symbol updates the canvas and layer summary", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Symbols", exact: true }).click();

    const symbolItem = page.locator(".toolbar-symbol-item").first();
    await symbolItem.click();

    await expect(page.locator('.rightbar-layer-row[title^="symbols: 1/"]')).toBeVisible();
    await expect(page.locator("svg.flag-svg > svg").first()).toBeVisible();

    const snapshot = await getDesignSnapshot(page);
    expect(snapshot.overlays.some((overlay) => overlay.type === "symbol")).toBe(true);
  });

  test("symbols:loaded refreshes the live symbol categories and grid", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Symbols", exact: true }).click();

    await page.locator("aside.toolbar").evaluate((aside) => {
      aside.dispatchEvent(new CustomEvent("symbols:loaded", {
        detail: {
          symbols: [{
            id: "runtime-probe-symbol",
            name: "Runtime Probe",
            category: "Runtime Test",
            viewBox: "0 0 100 100",
            path: "M10 10 L90 10 L50 90 Z",
          }],
        },
        bubbles: false,
      }));
    });

    const runtimeCategory = page.locator(".toolbar-cat-btn", { hasText: "Runtime Test" });
    await expect(runtimeCategory).toBeVisible();
    await runtimeCategory.click();
    await expect(page.locator(".toolbar-symbol-item")).toHaveCount(1);
  });

  test("rotating a selected overlay with the grid active snaps the angle", async ({ page }) => {
    await gotoWithHooks(page);
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Add Rectangle overlay" }).click();
    await page.getByRole("button", { name: "Overlays", exact: true }).click();
    await page.getByRole("button", { name: "Toggle pixel grid" }).click();

    const overlay = page.locator("svg.flag-svg [data-overlay-id]").first();
    const overlayBox = await overlay.boundingBox();
    if (!overlayBox) throw new Error("overlay has no bounding box");
    await page.mouse.click(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);

    const rotateHandle = page.locator('.bb-frame [data-handle-id="rotate"]');
    const handleBox = await rotateHandle.boundingBox();
    if (!handleBox) throw new Error("rotation handle has no bounding box");

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 80, handleBox.y + handleBox.height / 2 + 50, { steps: 5 });
    await page.mouse.up();

    const snapshot = await getDesignSnapshot(page);
    expect(snapshot.overlays[0].rotation).not.toBe(0);
    expect(Math.abs(snapshot.overlays[0].rotation % 15)).toBeLessThan(0.001);
    const frameTransform = await page.locator(".bb-frame").evaluate((element) =>
      (element as HTMLDivElement).style.transform,
    );
    expect(frameTransform).toContain("rotate(");
  });
});