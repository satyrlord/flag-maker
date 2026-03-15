import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLeftbar } from "@/ui/leftbar";
import type { Overlay } from "@/types";
import {
  BUILTIN_SYMBOL_CATEGORIES,
  BUILTIN_SYMBOLS,
  getLoadedBuiltinSymbols,
  loadBuiltinSymbolsForCategory,
} from "@/symbols";
import config from "@/config/leftbar-config.json";
import { validateLeftbarConfig } from "@/ui/leftbarConfig";
import { ALL_TEMPLATE_FACTORIES, TEMPLATE_GROUPED_CONFIGS, validateTemplateCatalog } from "@/templateCatalog";
import {
  NATIONAL_FLAG_CONFIGS,
} from "@/templates";

/* Mock matchMedia (not implemented in jsdom) */
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1280px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

async function waitForAssertion(assertion: () => void, attempts = 40): Promise<void> {
  let lastError: unknown;
  for (let index = 0; index < attempts; index += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  throw lastError;
}

describe("createLeftbar", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
  });

  it("returns an aside element", () => {
    expect(toolbar.tagName).toBe("ASIDE");
  });

  it("contains 6 tab buttons", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    expect(tabs.length).toBe(7);
  });

  it("tab buttons have correct labels", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    const labels = Array.from(tabs).map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Templates", "Aspect Ratio", "Stripes", "Overlays", "Starfield", "Symbols", "Saved"]);
  });

  it("shows Templates panel by default", () => {
    const heading = toolbar.querySelector("h3");
    expect(heading?.textContent).toMatch(/Templates/i);
  });

  it("Templates tab is active by default", () => {
    const activeBtn = toolbar.querySelector('nav[aria-label="Toolbar tabs"] button.active');
    expect(activeBtn?.getAttribute("aria-label")).toBe("Templates");
  });

  it("Saved tab shows 'No saved designs yet' placeholder", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    // Saved is the last tab (index 6)
    tabs[6].click();
    const panel = toolbar.querySelector(".toolbar-panel-content");
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("No saved designs yet");
  });

  function switchToRatioTab(): void {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[1].click();
  }

  it("shows all configured aspect ratio buttons", () => {
    switchToRatioTab();
    const ratioBtns = toolbar.querySelectorAll(".toolbar-ratio-btn");
    expect(ratioBtns.length).toBe(config.ratios.length);
  });

  it("has a sort select with commonality and value options", () => {
    switchToRatioTab();
    const select = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Sort aspect ratios"]');
    expect(select).not.toBeNull();
    const options = select!.querySelectorAll("option");
    expect(options.length).toBe(2);
    const values = Array.from(options).map((o) => o.value);
    expect(values).toContain("commonality");
    expect(values).toContain("value");
  });

  it("sorts ratios by commonality (most common first) by default", () => {
    switchToRatioTab();
    const btns = toolbar.querySelectorAll(".toolbar-ratio-btn");
    // Most common first (2:3 = commonality 84), least common last (4:3 = commonality 1, last in config)
    expect(btns[0].textContent).toBe("2:3");
    expect(btns[btns.length - 1].textContent).toBe("4:3");
  });

  it("re-sorts ratios by value (ascending h/w) when select changes", () => {
    switchToRatioTab();
    const select = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Sort aspect ratios"]')!;
    select.value = "value";
    select.dispatchEvent(new Event("change"));
    const btns = toolbar.querySelectorAll(".toolbar-ratio-btn");
    expect(btns[0].textContent).toBe("11:28");
    expect(btns[btns.length - 1].textContent).toBe("4:3");
  });

  it("accepts the current leftbar config", () => {
    expect(() => validateLeftbarConfig(config)).not.toThrow();
  });

  it("accepts the current template catalog", () => {
    expect(() => validateTemplateCatalog(config.templateGroups, TEMPLATE_GROUPED_CONFIGS, ALL_TEMPLATE_FACTORIES)).not.toThrow();
  });

  it("rejects a config with an unknown template id", () => {
    const invalid = TEMPLATE_GROUPED_CONFIGS.map((group) =>
      group.group === "Division"
        ? { ...group, entries: [...group.entries, { id: "missing", name: "Missing" }] }
        : group,
    );
    expect(() => validateTemplateCatalog(config.templateGroups, invalid, ALL_TEMPLATE_FACTORIES)).toThrow(/missing template factories/i);
  });

  it("rejects a config with an invalid default ratio", () => {
    const invalid = {
      ...config,
      defaultRatio: "9:99",
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultRatio/i);
  });

  it("rejects a config with no ratios", () => {
    const invalid = {
      ...config,
      ratios: [],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/ratios must not be empty/i);
  });

  it("rejects duplicate ratio labels", () => {
    const invalid = {
      ...config,
      ratios: [config.ratios[0], config.ratios[0]],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/ratio labels must be unique/i);
  });

  it("rejects a ratio with the wrong number of values", () => {
    const invalid = {
      ...config,
      ratios: [{ ...config.ratios[0], ratio: [1] }],
      defaultRatio: config.ratios[0].label,
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/exactly two values/i);
  });

  it("rejects a non-positive ratio", () => {
    const invalid = {
      ...config,
      ratios: [{ ...config.ratios[0], ratio: [0, 1] }],
      defaultRatio: config.ratios[0].label,
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/must be positive/i);
  });

  it("rejects an invalid stripe default count range", () => {
    const invalid = {
      ...config,
      stripes: {
        ...config.stripes,
        minCount: 4,
        defaultCount: 3,
      },
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultCount must be within/i);
  });

  it("rejects default colors shorter than the stripe max count", () => {
    const invalid = {
      ...config,
      stripes: {
        ...config.stripes,
        defaultColors: ["#ffffff"],
      },
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultColors must cover maxCount/i);
  });

  it("rejects duplicate overlay type ids", () => {
    const invalid = {
      ...config,
      overlayTypes: [config.overlayTypes[0], config.overlayTypes[0]],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/overlay type IDs must be unique/i);
  });

  it("rejects a config with a template group missing from templateGroups", () => {
    const invalid = [...TEMPLATE_GROUPED_CONFIGS, { group: "Historic", entries: [{ id: "perPale", name: "Per Pale Copy" }] }];
    expect(() => validateTemplateCatalog(config.templateGroups, invalid, ALL_TEMPLATE_FACTORIES)).toThrow(/template groups missing/i);
  });

  it("rejects a config with an empty declared template group", () => {
    const invalid = {
      ...config,
      templateGroups: [...config.templateGroups, "Unused"],
    };
    expect(() => validateTemplateCatalog(invalid.templateGroups, TEMPLATE_GROUPED_CONFIGS, ALL_TEMPLATE_FACTORIES)).toThrow(/has no templates/i);
  });

  it("rejects duplicate template groups", () => {
    const invalid = {
      ...config,
      templateGroups: [config.templateGroups[0], config.templateGroups[0]],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/templateGroups must be unique/i);
  });

  it("rejects a config missing a required layer group", () => {
    const { stripes: _s, ...partialGroups } = config.layerGroups;
    const invalid = {
      ...config,
      layerGroups: partialGroups,
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/must include "stripes"/i);
  });

  it("rejects layer group with invalid min/max", () => {
    const invalid = {
      ...config,
      layerGroups: {
        ...config.layerGroups,
        overlays: { minLayers: 5, maxLayers: 2 },
      },
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/invalid min\/max/i);
  });

  it("rejects an invalid defaultOrientation", () => {
    const invalid = {
      ...config,
      defaultOrientation: "diagonal",
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultOrientation/i);
  });

  it("rejects a malformed defaultRatio string", () => {
    const invalid = {
      ...config,
      ratios: [{ label: "bad", ratio: [2, 3], commonality: 1 }],
      defaultRatio: "bad",
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultRatio.*must be.*N:M/i);
  });

  it("rejects an invalid defaultOverlayFill", () => {
    const invalid = {
      ...config,
      defaultOverlayFill: "red",
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/defaultOverlayFill/i);
  });

  it("rejects an invalid layerGroupOrder", () => {
    const invalid = {
      ...config,
      layerGroupOrder: ["stripes", "overlays"],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/layerGroupOrder/i);
  });

  it("rejects unsupported overlay type IDs", () => {
    const invalid = {
      ...config,
      overlayTypes: [...config.overlayTypes, { id: "hexagon", label: "Hexagon", shortLabel: "Hex" }],
    };
    expect(() => validateLeftbarConfig(invalid)).toThrow(/unsupported overlay types.*hexagon/i);
  });

  it("2:3 ratio is active by default", () => {
    switchToRatioTab();
    const activeBtn = toolbar.querySelector(".toolbar-ratio-btn.active");
    expect(activeBtn?.textContent).toBe("2:3");
  });

  it("clicking a ratio button updates active state", () => {
    switchToRatioTab();
    const btns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-ratio-btn");
    const btn1x1 = Array.from(btns).find((b) => b.textContent === "1:1")!;
    btn1x1.click();
    expect(btn1x1.classList.contains("active")).toBe(true);
    const btn23 = Array.from(btns).find((b) => b.textContent === "2:3")!;
    expect(btn23.classList.contains("active")).toBe(false);
  });

  it("clicking ratio button emits toolbar:ratio event", () => {
    switchToRatioTab();
    let receivedDetail: unknown = null;
    toolbar.addEventListener("toolbar:ratio", ((e: CustomEvent) => {
      receivedDetail = e.detail;
    }) as EventListener);

    const btns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-ratio-btn");
    const btn1x2 = Array.from(btns).find((b) => b.textContent === "1:2")!;
    btn1x2.click();
    expect(receivedDetail).toEqual({ ratio: [1, 2] });
  });
});

describe("Stripes tab", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    // Switch to Stripes tab
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    // Simulate desktop width for immediate tab switch
    tabs[2].click();
  });

  it("shows orientation controls", () => {
    const orientBtns = toolbar.querySelectorAll(".toolbar-orient-btn");
    expect(orientBtns.length).toBe(2);
  });

  it("horizontal is active by default", () => {
    const active = toolbar.querySelector(".toolbar-orient-btn.active");
    expect(active?.textContent).toBe("Horizontal");
  });

  it("shows stripe count controls", () => {
    const countBtns = toolbar.querySelectorAll(".toolbar-count-btn");
    expect(countBtns.length).toBe(2);
    const label = toolbar.querySelector(".toolbar-count-label");
    expect(label?.textContent).toBe("3");
  });

  it("incrementing stripe count emits event", () => {
    let detail: unknown = null;
    toolbar.addEventListener("toolbar:stripes", ((e: CustomEvent) => {
      detail = e.detail;
    }) as EventListener);

    const plusBtn = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-count-btn")[1];
    plusBtn.click();
    expect(detail).toEqual({ count: 4 });
  });

  it("stripe count does not go below 1", () => {
    const minusBtn = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-count-btn")[0];
    // Click minus 5 times (start at 3: 2, 1, 1, 1, 1)
    for (let i = 0; i < 5; i++) minusBtn.click();
    const label = toolbar.querySelector(".toolbar-count-label");
    expect(label?.textContent).toBe("1");
  });

  it("stripe count does not exceed 14", () => {
    const plusBtn = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-count-btn")[1];
    for (let i = 0; i < 20; i++) plusBtn.click();
    const label = toolbar.querySelector(".toolbar-count-label");
    expect(label?.textContent).toBe("14");
  });

  it("shows color pickers matching stripe count", () => {
    const pickers = toolbar.querySelectorAll(".toolbar-color-picker");
    expect(pickers.length).toBe(3);
  });

  it("syncs color pickers when toolbar:sync-colors event is dispatched", () => {
    const syncColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-colors", {
        detail: { colors: syncColors },
        bubbles: false,
      }),
    );

    const pickers = toolbar.querySelectorAll<HTMLInputElement>(".toolbar-color-picker");
    expect(pickers.length).toBe(4);
    expect(pickers[0].value).toBe("#ff0000");
    expect(pickers[1].value).toBe("#00ff00");
    expect(pickers[2].value).toBe("#0000ff");
    expect(pickers[3].value).toBe("#ffff00");

    const countLabel = toolbar.querySelector(".toolbar-count-label");
    expect(countLabel?.textContent).toBe("4");
  });
});

describe("Templates tab", () => {
  let toolbar: HTMLElement;
  const divisionTemplates = TEMPLATE_GROUPED_CONFIGS.find((group) => group.group === "Division")!.entries.length;
  const nationalTemplates = TEMPLATE_GROUPED_CONFIGS.find((group) => group.group === "National")!.entries.length;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[0].click(); // Templates
  });

  it("shows Division, National, and State Level section titles", () => {
    const titles = toolbar.querySelectorAll(".toolbar-section-title");
    const texts = Array.from(titles).map((t) => t.textContent);
    expect(texts).toContain("Division");
    expect(texts).toContain("National");
    expect(texts).toContain("State Level");
  });

  it("opens only the Division section by default", () => {
    const toggles = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-template-section-toggle");
    expect(toggles[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(toggles[1]?.getAttribute("aria-expanded")).toBe("false");
    expect(toggles[2]?.getAttribute("aria-expanded")).toBe("false");
    expect(toolbar.querySelector('[aria-label="Apply France template"]')).toBeNull();
  });

  it("renders only Division template items with SVG thumbnails by default", () => {
    const items = toolbar.querySelectorAll(".toolbar-template-item");
    expect(items.length).toBe(divisionTemplates);
    for (const item of items) {
      expect(item.querySelector("svg")).not.toBeNull();
    }
  });

  it("lazy loads National templates when expanding the section", async () => {
    const nationalToggle = Array.from(toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-template-section-toggle")).find((button) =>
      button.textContent?.includes("National"),
    )!;

    nationalToggle.click();

    expect(nationalToggle.getAttribute("aria-expanded")).toBe("true");
    await waitForAssertion(() => {
      const items = toolbar.querySelectorAll(".toolbar-template-item");
      expect(items.length).toBe(divisionTemplates + nationalTemplates);
      expect(toolbar.querySelector('[aria-label="Apply France template"]')).not.toBeNull();
    });
  });

  it("uses static image previews for done templates and SVG previews for unfinished ones", async () => {
    const nationalToggle = Array.from(toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-template-section-toggle")).find((button) =>
      button.textContent?.includes("National"),
    )!;

    nationalToggle.click();

    await waitForAssertion(() => {
      const austriaButton = toolbar.querySelector<HTMLButtonElement>('[aria-label="Apply Austria template"]');
      const franceButton = toolbar.querySelector<HTMLButtonElement>('[aria-label="Apply France template"]');

      expect(austriaButton).not.toBeNull();
      expect(franceButton).not.toBeNull();
      expect(austriaButton!.querySelector("img.toolbar-template-thumb")).not.toBeNull();
      expect(austriaButton!.querySelector("svg")).toBeNull();
      expect(franceButton!.querySelector("svg")).not.toBeNull();
      expect(franceButton!.querySelector("img.toolbar-template-thumb")).toBeNull();
    });
  });

  it("clicking a template emits toolbar:template event", () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:template", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const firstItem = toolbar.querySelector<HTMLButtonElement>(".toolbar-template-item")!;
    firstItem.click();
    expect(detail).not.toBeNull();
    expect(detail!.id).toBeTruthy();
    expect(detail!.config).toBeTruthy();
  });
});

describe("Symbols tab", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click(); // Symbols
  });

  it("has a search input", () => {
    const search = toolbar.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).not.toBeNull();
    expect(search!.placeholder).toBe("Search symbols...");
  });

  it("defaults to the first category after it hydrates", async () => {
    const firstCategory = BUILTIN_SYMBOL_CATEGORIES[0]!;
    await loadBuiltinSymbolsForCategory(firstCategory);

    const activeCatBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-cat-btn.active");
    expect(activeCatBtn).not.toBeNull();
    expect(activeCatBtn!.textContent).toBe(firstCategory);
    const expectedCount = getLoadedBuiltinSymbols().filter((s) => s.category === firstCategory).length;
    await waitForAssertion(() => {
      expect(toolbar.querySelectorAll(".toolbar-symbol-item").length).toBe(expectedCount);
    });
  });

  it("filters symbols by search text within the active category", async () => {
    const celestialCategory = "Celestial";
    const celestialBtn = Array.from(toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-cat-btn"))
      .find((button) => button.textContent === celestialCategory);

    expect(celestialBtn).toBeTruthy();
    celestialBtn!.click();
    await loadBuiltinSymbolsForCategory(celestialCategory);

    await waitForAssertion(() => {
      expect(toolbar.querySelector<HTMLButtonElement>(".toolbar-cat-btn.active")?.textContent).toBe(celestialCategory);
    });

    const search = toolbar.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = "sol";
    search.dispatchEvent(new Event("input"));

    await waitForAssertion(() => {
      const items = toolbar.querySelectorAll(".toolbar-symbol-item");
      expect(items.length).toBe(1);
    });
  });

  it("clicking a symbol emits toolbar:symbol event", async () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:symbol", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    await waitForAssertion(() => {
      expect(toolbar.querySelectorAll(".toolbar-symbol-item").length).toBeGreaterThan(0);
    });

    const firstItem = toolbar.querySelector<HTMLButtonElement>(".toolbar-symbol-item")!;
    firstItem.click();
    expect(detail).not.toBeNull();
    expect(detail!.symbolId).toBeTruthy();
  });
});

describe("Overlays tab", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[3].click(); // Overlays
  });

  it("shows add overlay buttons for rectangle, circle, triangle", () => {
    const addBtns = toolbar.querySelectorAll(".toolbar-add-btn");
    expect(addBtns.length).toBe(3);
    const labels = Array.from(addBtns).map((b) => b.textContent);
    expect(labels).toEqual(["Rectangle", "Circle", "Triangle"]);
  });

  it("clicking add overlay emits toolbar:add-overlay event", () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:add-overlay", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const rectBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-add-btn")!;
    rectBtn.click();
    expect(detail).toEqual({ type: "rectangle" });
  });

  it("shows empty layer list text", () => {
    const empty = toolbar.querySelector(".toolbar-empty-text");
    expect(empty?.textContent).toBe("No overlays yet");
  });

  it("shows layer count indicator", () => {
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toBe("0 / 99 layers");
  });

  it("renders layer rows when sync-layers event dispatched with overlays", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
      {
        id: "ov2", type: "circle", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#00FF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const rows = toolbar.querySelectorAll(".toolbar-layer-row");
    expect(rows.length).toBe(2);
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toBe("2 / 99 layers");
  });

  it("does not show symbol overlays in overlay layer list", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
      {
        id: "sym1", type: "symbol", symbolId: "star5", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const rows = toolbar.querySelectorAll(".toolbar-layer-row");
    expect(rows.length).toBe(1);
  });

  it("visibility button emits toolbar:layer-visibility event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-visibility", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const visBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Hide layer"]');
    expect(visBtn).not.toBeNull();
    visBtn!.click();
    expect(detail).toEqual({ id: "ov1", visible: false });
  });

  it("visibility button shows eye-off icon for hidden layers", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
        visible: false,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const visBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Show layer"]');
    expect(visBtn).not.toBeNull();
  });

  it("lock button emits toolbar:layer-lock event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-lock", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const lockBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Lock layer"]');
    expect(lockBtn).not.toBeNull();
    lockBtn!.click();
    expect(detail).toEqual({ id: "ov1", locked: true });
  });

  it("lock button shows lock icon for locked layers", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
        locked: true,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const lockBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Unlock layer"]');
    expect(lockBtn).not.toBeNull();
  });

  it("delete button emits toolbar:layer-remove event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-remove", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const delBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Delete layer"]');
    expect(delBtn).not.toBeNull();
    delBtn!.click();
    expect(detail).toEqual({ id: "ov1" });
  });

  it("move up button emits toolbar:layer-move event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
      {
        id: "ov2", type: "circle", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#00FF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-move", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    // First layer (index 0) can move up
    const upBtns = toolbar.querySelectorAll<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Move layer up"]');
    // Rows are in reverse order (top-most first), so last row = index 0 overlay
    const enabledUpBtn = Array.from(upBtns).find((b) => !b.disabled);
    expect(enabledUpBtn).not.toBeUndefined();
    enabledUpBtn!.click();
    expect(detail).not.toBeNull();
    expect(detail!.direction).toBe("up");
  });

  it("move down button emits toolbar:layer-move event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
      {
        id: "ov2", type: "circle", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#00FF00", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-move", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    // Second layer (index 1) can move down
    const downBtns = toolbar.querySelectorAll<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Move layer down"]');
    const enabledDownBtn = Array.from(downBtns).find((b) => !b.disabled);
    expect(enabledDownBtn).not.toBeUndefined();
    enabledDownBtn!.click();
    expect(detail).not.toBeNull();
    expect(detail!.direction).toBe("down");
  });

  it("color picker emits toolbar:layer-color event", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-color", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const colorPicker = toolbar.querySelector<HTMLInputElement>(".toolbar-layer-color");
    expect(colorPicker).not.toBeNull();
    Object.defineProperty(colorPicker!, "value", { value: "#0000FF", writable: true });
    colorPicker!.dispatchEvent(new Event("input"));
    expect(detail).toEqual({ id: "ov1", fill: "#0000FF" });
  });

  it("layer list clears when synced with empty overlays", () => {
    // First add some overlays
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    expect(toolbar.querySelectorAll(".toolbar-layer-row").length).toBe(1);

    // Now clear
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [] }, bubbles: false }),
    );
    expect(toolbar.querySelectorAll(".toolbar-layer-row").length).toBe(0);
    const empty = toolbar.querySelector(".toolbar-overlay-list .toolbar-empty-text");
    expect(empty?.textContent).toBe("No overlays yet");
  });
});

describe("Starfield tab", () => {
  let toolbar: HTMLElement;

  function switchToStarfieldTab(): void {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[4].click(); // Starfield
  }

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    switchToStarfieldTab();
  });

  it("shows add starfield button", () => {
    const addBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Add starfield overlay"]');
    expect(addBtn).not.toBeNull();
    expect(addBtn!.textContent).toContain("Add starfield");
  });

  it("shows layer count info", () => {
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toContain("0 / 10 starfields");
  });

  it("shows empty text when no starfields", () => {
    const empty = toolbar.querySelector(".toolbar-empty-text");
    expect(empty?.textContent).toBe("Add a starfield to begin");
  });

  it("clicking add button emits toolbar:add-starfield event", () => {
    let emitted = false;
    toolbar.addEventListener("toolbar:add-starfield", () => { emitted = true; });
    const addBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Add starfield overlay"]')!;
    addBtn.click();
    expect(emitted).toBe(true);
  });

  it("has distribution dropdown with correct options", () => {
    const select = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Star distribution pattern"]');
    expect(select).not.toBeNull();
    const options = Array.from(select!.options).map((o) => o.value);
    expect(options).toContain("ring");
    expect(options).toContain("staggered-grid");
    expect(options).toContain("grid");
    expect(options).toContain("line");
    expect(options).toContain("arc");
  });

  it("syncs layers and shows starfield in layer list", () => {
    const starfield: Overlay = {
      id: "sf1", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    const rows = toolbar.querySelectorAll(".toolbar-layer-row");
    expect(rows.length).toBe(1);
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toContain("1 / 10 starfields");
  });

  it("syncs controls to selected starfield", () => {
    const starfield: Overlay = {
      id: "sf2", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "staggered-grid", starCount: 50,
      starCols: 6,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    // Props section should now be visible with values from the overlay
    const distSelect = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Star distribution pattern"]');
    expect(distSelect).not.toBeNull();
    expect(distSelect!.value).toBe("staggered-grid");
  });

  it("emits starfield-update when distribution changes", () => {
    const starfield: Overlay = {
      id: "sf3", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const distSelect = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Star distribution pattern"]')!;
    distSelect.value = "grid";
    distSelect.dispatchEvent(new Event("change"));
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starDistribution).toBe("grid");
  });

  it("emits starfield-update when star count is incremented", () => {
    const starfield: Overlay = {
      id: "sf4", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const plusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase star count"]')!;
    plusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starCount).toBe(13);
  });

  it("emits starfield-update when star count is decremented", () => {
    const starfield: Overlay = {
      id: "sf5", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const minusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease star count"]')!;
    minusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starCount).toBe(11);
  });

  it("emits starfield-update when points are changed", () => {
    const starfield: Overlay = {
      id: "sf6", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const plusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase star points"]')!;
    plusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starPoints).toBe(6);
  });

  it("emits starfield-update when point length slider changes", () => {
    const starfield: Overlay = {
      id: "sf7", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const slider = toolbar.querySelector<HTMLInputElement>('input[aria-label="Star point length"]')!;
    slider.value = "50";
    slider.dispatchEvent(new Event("input"));
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starPointLength).toBe(0.5);
  });

  it("emits starfield-update when size slider changes", () => {
    const starfield: Overlay = {
      id: "sf8", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const slider = toolbar.querySelector<HTMLInputElement>('input[aria-label="Star size"]')!;
    slider.value = "70";
    slider.dispatchEvent(new Event("input"));
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starSize).toBe(70);
  });

  it("emits starfield-update when color changes", () => {
    const starfield: Overlay = {
      id: "sf9", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const colorPicker = toolbar.querySelector<HTMLInputElement>('input[aria-label="Star fill color"]')!;
    colorPicker.value = "#FF0000";
    colorPicker.dispatchEvent(new Event("input"));
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).fill).toBe("#ff0000");
  });

  it("emits starfield-update when rotate checkbox is toggled", () => {
    const starfield: Overlay = {
      id: "sf10", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const checkbox = toolbar.querySelector<HTMLInputElement>('input[aria-label="Rotate stars with position"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starRotateWithPosition).toBe(true);
  });

  it("emits starfield-update when column count changes", () => {
    const starfield: Overlay = {
      id: "sf11", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "staggered-grid", starCount: 50,
      starCols: 6,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const plusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase column count"]')!;
    plusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starCols).toBe(7);
  });

  it("clears selection when selected starfield is removed", () => {
    const starfield: Overlay = {
      id: "sf-remove", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    // Click the layer row to select it
    const row = toolbar.querySelector(".toolbar-layer-row") as HTMLElement;
    row?.click();
    // Now remove it
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [] }, bubbles: false }),
    );
    const empty = toolbar.querySelector(".toolbar-empty-text");
    expect(empty?.textContent).toBe("Add a starfield to begin");
  });

  it("decreases column count with minus button", () => {
    const starfield: Overlay = {
      id: "sf-col-minus", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "grid", starCount: 9,
      starCols: 5,
      starPoints: 5, starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const minusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease column count"]')!;
    minusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starCols).toBe(4);
  });

  it("decreases star points with minus button", () => {
    const starfield: Overlay = {
      id: "sf-pts-minus", type: "starfield",
      x: 50, y: 50, w: 40, h: 40,
      rotation: 0, fill: "#FFD700", stroke: "#0000", strokeWidth: 0, opacity: 1,
      starDistribution: "ring", starCount: 12,
      starPoints: 6,
      starPointLength: 0.38, starSize: 50,
    };
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays: [starfield] }, bubbles: false }),
    );
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:starfield-update", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);
    const minusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease star points"]')!;
    minusBtn.click();
    expect(detail).not.toBeNull();
    expect((detail!.props as Record<string, unknown>).starPoints).toBe(5);
  });

  it("does not emit events when no starfield is selected", () => {
    // No starfield synced — controls exist but have no selected overlay
    let emitted = false;
    toolbar.addEventListener("toolbar:starfield-update", () => { emitted = true; });
    // Try clicking count buttons (they should no-op because getSelected() returns undefined)
    const plusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase star count"]')!;
    plusBtn.click();
    expect(emitted).toBe(false);
    const minusBtn = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease star count"]')!;
    minusBtn.click();
    expect(emitted).toBe(false);
    const colsPlus = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase column count"]')!;
    colsPlus.click();
    expect(emitted).toBe(false);
    const colsMinus = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease column count"]')!;
    colsMinus.click();
    expect(emitted).toBe(false);
    const pointsPlus = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Increase star points"]')!;
    pointsPlus.click();
    expect(emitted).toBe(false);
    const pointsMinus = toolbar.querySelector<HTMLButtonElement>('button[aria-label="Decrease star points"]')!;
    pointsMinus.click();
    expect(emitted).toBe(false);
  });
});

describe("Symbols tab - layer management", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click(); // Symbols
  });

  it("shows symbol layer count indicator", () => {
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toBe("0 / 99 layers");
  });

  it("shows empty active symbols text", () => {
    const empty = toolbar.querySelector(".toolbar-overlay-list .toolbar-empty-text");
    expect(empty?.textContent).toBe("No symbols placed");
  });

  it("renders symbol layer rows when sync-layers dispatched", () => {
    const overlays: Overlay[] = [
      {
        id: "sym1", type: "symbol", symbolId: "sol_de_mayo", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const rows = toolbar.querySelectorAll(".toolbar-layer-row");
    expect(rows.length).toBe(1);
    const countEl = toolbar.querySelector(".toolbar-layer-count");
    expect(countEl?.textContent).toBe("1 / 99 layers");
  });

  it("does not include non-symbol overlays in symbol layer list", () => {
    const overlays: Overlay[] = [
      {
        id: "ov1", type: "rectangle", x: 50, y: 50, w: 30, h: 20,
        rotation: 0, fill: "#FF0000", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
      {
        id: "sym1", type: "symbol", symbolId: "sol_de_mayo", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const rows = toolbar.querySelectorAll(".toolbar-layer-row");
    expect(rows.length).toBe(1);
  });

  it("symbol layer has a color picker", () => {
    const overlays: Overlay[] = [
      {
        id: "sym1", type: "symbol", symbolId: "sol_de_mayo", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );
    const colorPicker = toolbar.querySelector(".toolbar-layer-color");
    expect(colorPicker).not.toBeNull();
  });

  it("symbol layer delete button emits toolbar:layer-remove", () => {
    const overlays: Overlay[] = [
      {
        id: "sym1", type: "symbol", symbolId: "sol_de_mayo", x: 50, y: 50, w: 20, h: 20,
        rotation: 0, fill: "#FFFFFF", stroke: "#0000", strokeWidth: 0, opacity: 1,
      },
    ];
    toolbar.dispatchEvent(
      new CustomEvent("toolbar:sync-layers", { detail: { overlays }, bubbles: false }),
    );

    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:layer-remove", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const delBtn = toolbar.querySelector<HTMLButtonElement>('.toolbar-layer-btn[aria-label="Delete layer"]');
    expect(delBtn).not.toBeNull();
    delBtn!.click();
    expect(detail).toEqual({ id: "sym1" });
  });
});

describe("Stripes tab - color and orientation events", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[2].click(); // Stripes
  });

  it("color picker input emits toolbar:color event", () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:color", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const picker = toolbar.querySelector<HTMLInputElement>(".toolbar-color-picker")!;
    picker.value = "#ff0000";
    picker.dispatchEvent(new Event("input"));
    expect(detail).toEqual({ index: 0, color: "#ff0000" });
  });

  it("clicking vertical orientation emits toolbar:orientation event", () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:orientation", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

    const orientBtns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-orient-btn");
    orientBtns[1].click(); // Vertical
    expect(detail).toEqual({ orientation: "vertical" });
    expect(orientBtns[1].classList.contains("active")).toBe(true);
    expect(orientBtns[0].classList.contains("active")).toBe(false);
  });
});

describe("Symbols tab - no results", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click(); // Symbols
  });

  it("shows no symbols found when search yields no results", () => {
    const search = toolbar.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = "zzzznonexistent";
    search.dispatchEvent(new Event("input"));
    const empty = toolbar.querySelectorAll(".toolbar-empty-text");
    const noResults = Array.from(empty).find((e) => e.textContent === "No symbols found");
    expect(noResults).not.toBeUndefined();
  });
});

describe("Symbols tab - dynamic symbol loading", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click(); // Symbols
  });

  it("symbols:loaded event adds new symbols and rebuilds tabs", async () => {
    const newSymbols = [
      { id: "test_loaded_1", name: "Loaded Symbol", category: "TestCat", svg: "<g/>" },
    ];
    toolbar.dispatchEvent(new CustomEvent("symbols:loaded", { detail: { symbols: newSymbols } }));

    // The new category tab should now exist
    const catBtns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-cat-btn");
    const catTexts = Array.from(catBtns).map((b) => b.textContent);
    expect(catTexts).toContain("TestCat");

    // Click the new category tab and verify the symbol appears
    const testCatBtn = Array.from(catBtns).find((b) => b.textContent === "TestCat")!;
    testCatBtn.click();

    await waitForAssertion(() => {
      const items = toolbar.querySelectorAll(".toolbar-symbol-item");
      expect(items.length).toBe(1);
    });
  });
});

describe("Symbols tab - lazy loading with IntersectionObserver", () => {
  let observeCallback: IntersectionObserverCallback;
  let observedElements: Element[];

  beforeEach(async () => {
    vi.resetModules();
    observedElements = [];

    // Mock IntersectionObserver as a class before importing leftbar
    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        observeCallback = cb;
      }
      observe(el: Element) { observedElements.push(el); }
      unobserve() { /* noop */ }
      disconnect() { /* noop */ }
    }
    vi.stubGlobal("IntersectionObserver", MockIO);

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.doUnmock("@/symbols");
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders symbols in batches and creates sentinel for more", async () => {
    // Generate 40 symbols in one category to exceed BATCH_SIZE (30)
    const manySymbols = Array.from({ length: 40 }, (_, i) => ({
      id: `lazy_sym_${i}`,
      name: `Lazy ${i}`,
      category: "LazyCategory",
      svg: "<g/>",
    }));

    vi.doMock("@/symbols", () => ({
      BUILTIN_SYMBOLS: manySymbols,
      BUILTIN_SYMBOL_CATEGORIES: ["LazyCategory"],
      getLoadedBuiltinSymbols: () => [...manySymbols],
      isBuiltinSymbolCategoryLoaded: () => true,
      loadBuiltinSymbolsForCategory: vi.fn().mockResolvedValue(manySymbols),
      ensureBuiltinSymbolsByIds: vi.fn().mockResolvedValue([]),
    }));

    const { createLeftbar: createLeftbarLazy } = await import("@/ui/leftbar");
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    const toolbar = createLeftbarLazy();
    document.body.appendChild(toolbar);

    // Click Symbols tab
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click();

    await waitForAssertion(() => {
      const items = toolbar.querySelectorAll(".toolbar-symbol-item");
      expect(items.length).toBe(30);
      expect(observedElements.length).toBe(1);
    });

    // Simulate the sentinel becoming visible
    observeCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    // Remaining 10 should now render
    await waitForAssertion(() => {
      const itemsAfter = toolbar.querySelectorAll(".toolbar-symbol-item");
      expect(itemsAfter.length).toBe(40);
    });
  });
});

describe("Mobile panel behavior", () => {
  let toolbar: HTMLElement;
  let changeHandler: ((e: MediaQueryListEvent) => void) | null;
  let mqMock: { matches: boolean };

  beforeEach(() => {
    changeHandler = null;
    mqMock = { matches: false };
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const mq = {
          get matches() {
            return query === "(min-width: 1280px)" ? mqMock.matches : false;
          },
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn().mockImplementation(
            (_event: string, handler: (e: MediaQueryListEvent) => void) => {
              changeHandler = handler;
            },
          ),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
        return mq;
      }),
    });

    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
  });

  it("opens panel on tab click in mobile mode", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    // Click a different tab (Stripes)
    tabs[1].click();
    const panel = toolbar.querySelector(".toolbar-panel");
    expect(panel?.classList.contains("panel-open")).toBe(true);
  });

  it("closes panel when same tab clicked twice in mobile mode", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    // First click opens
    tabs[1].click();
    // Second click on same tab closes
    tabs[1].click();
    const panel = toolbar.querySelector(".toolbar-panel");
    expect(panel?.classList.contains("panel-open")).toBe(false);
  });

  it("closes panel when backdrop is clicked", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[1].click(); // open panel
    const backdrop = toolbar.querySelector(".toolbar-backdrop") as HTMLElement;
    expect(backdrop).not.toBeNull();
    backdrop.click();
    const panel = toolbar.querySelector(".toolbar-panel");
    expect(panel?.classList.contains("panel-open")).toBe(false);
  });

  it("handleResize closes panel when switching to mobile", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[1].click(); // open panel
    expect(changeHandler).not.toBeNull();
    // Simulate resize to mobile
    changeHandler!({ matches: false } as MediaQueryListEvent);
    const panel = toolbar.querySelector(".toolbar-panel");
    expect(panel?.classList.contains("panel-open")).toBe(false);
  });

  it("handleResize removes backdrop when switching to desktop", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[1].click(); // open panel (creates backdrop)
    expect(changeHandler).not.toBeNull();
    // Simulate resize to desktop by updating mock
    mqMock.matches = true;
    changeHandler!({ matches: true } as MediaQueryListEvent);
    const backdrop = toolbar.querySelector(".toolbar-backdrop");
    expect(backdrop).toBeNull();
  });

  it("handleResize to desktop does not throw when backdrop is not in DOM", () => {
    // Switch to desktop mode without ever opening the panel (backdrop never mounted)
    expect(changeHandler).not.toBeNull();
    mqMock.matches = true;
    expect(() => changeHandler!({ matches: true } as MediaQueryListEvent)).not.toThrow();
    const backdrop = toolbar.querySelector(".toolbar-backdrop");
    expect(backdrop).toBeNull();
  });

  it("closePanel is safe when backdrop is not in DOM", () => {
    // Call handleResize to mobile mode without opening the panel first.
    // handleResize calls closePanel(), which has a guard on backdrop.parentElement.
    expect(changeHandler).not.toBeNull();
    expect(() => changeHandler!({ matches: false } as MediaQueryListEvent)).not.toThrow();
    const panel = toolbar.querySelector(".toolbar-panel");
    expect(panel?.classList.contains("panel-open")).toBe(false);
  });
});

describe("Symbols panel - symbolPreview fallthrough", () => {
  it("symbolPreview renders an empty SVG for a symbol with no path and no generator", async () => {
    // Store real symbols before reset
    const realSymbolsModule = await import("@/symbols");
    await realSymbolsModule.loadBuiltinSymbols();
    const realSymbols = realSymbolsModule.getLoadedBuiltinSymbols();

    vi.resetModules();

    vi.doMock("@/symbols", () => ({
      BUILTIN_SYMBOLS: [
        ...realSymbols,
        { id: "no_path_no_gen", name: "No Path No Gen", category: "Celestial" },
      ],
      BUILTIN_SYMBOL_CATEGORIES: [
        "Celestial",
        ...new Set(realSymbols.map((symbol) => symbol.category).filter((category) => category !== "Celestial")),
      ],
      getLoadedBuiltinSymbols: () => ([
        ...realSymbols,
        { id: "no_path_no_gen", name: "No Path No Gen", category: "Celestial" },
      ]),
      isBuiltinSymbolCategoryLoaded: () => true,
      loadBuiltinSymbolsForCategory: vi.fn().mockResolvedValue([
        ...realSymbols.filter((symbol) => symbol.category === "Celestial"),
        { id: "no_path_no_gen", name: "No Path No Gen", category: "Celestial" },
      ]),
      ensureBuiltinSymbolsByIds: vi.fn().mockResolvedValue([]),
    }));

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { createLeftbar: createLeftbarFresh } = await import("@/ui/leftbar");
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    const toolbar = createLeftbarFresh();
    document.body.appendChild(toolbar);

    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[5].click(); // Symbols

    // Default category is Celestial; injected symbol is also in Celestial
    const celestialCount = [...realSymbols, { id: "no_path_no_gen", name: "No Path No Gen", category: "Celestial" }]
      .filter((s) => s.category === "Celestial").length;

    await waitForAssertion(() => {
      expect(toolbar.querySelectorAll(".toolbar-symbol-item").length).toBe(celestialCount);
    });

    vi.doUnmock("@/symbols");
    vi.resetModules();
  });
});

describe("Ratio display mode toggle", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 1280px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    // Switch to Ratio tab (default is now Templates)
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[1].click();
  });

  function modeBtn(): HTMLButtonElement {
    const button = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-mode-btn");
    if (!button) {
      throw new Error("Ratio mode toggle button not found in leftbar toolbar.");
    }
    return button;
  }

  it("mode button is present in the ratio panel header", () => {
    expect(modeBtn()).not.toBeNull();
  });

  it("mode button is positioned between title and icon in the header", () => {
    const button = modeBtn();
    const header = button.parentElement;
    expect(header).not.toBeNull();
    if (!header) {
      return;
    }
    const children = Array.from(header.children);
    expect(children.length).toBeGreaterThanOrEqual(3);
    // Expect the button to be the middle child: [title, modeBtn, icon]
    expect(children[1]).toBe(button);
    expect(children[0]).not.toBeNull();
    expect(children[2]).not.toBeNull();
  });
  it("mode button starts in H:W mode", () => {
    expect(modeBtn().textContent).toBe("H:W");
  });

  it("default ratio buttons show H:W format", () => {
    // 2:3 is the default active ratio
    const activeBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-btn.active");
    expect(activeBtn?.textContent).toBe("2:3");
  });

  it("first click switches to W:H mode", () => {
    modeBtn().click();
    expect(modeBtn().textContent).toBe("W:H");
  });

  it("W/H mode flips ratio button text", () => {
    modeBtn().click();
    const activeBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-btn.active");
    // default active is 2:3 (H=2,W=3) → W/H = 3:2
    expect(activeBtn?.textContent).toBe("3:2");
  });

  it("second click switches to decimal mode", () => {
    modeBtn().click();
    modeBtn().click();
    expect(modeBtn().textContent).toBe("W/H");
  });

  it("decimal mode shows W/H as a decimal number", () => {
    modeBtn().click();
    modeBtn().click();
    const activeBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-btn.active");
    // 2:3 (H=2,W=3) → 3/2 = 1.5
    expect(activeBtn?.textContent).toBe("1.5");
  });

  it("third click cycles back to H:W mode", () => {
    modeBtn().click();
    modeBtn().click();
    modeBtn().click();
    expect(modeBtn().textContent).toBe("H:W");
  });

  it("cycling back to H/W restores original ratio text", () => {
    modeBtn().click();
    modeBtn().click();
    modeBtn().click();
    const activeBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-btn.active");
    expect(activeBtn?.textContent).toBe("2:3");
  });

  it("mode change updates all ratio buttons, not just the active one", () => {
    modeBtn().click(); // switch to W:H mode
    // Re-query after rebuild: aria-label is stable, textContent reflects the new mode
    const btns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-ratio-btn");
    // 1:2 (H=1,W=2) should display as 2:1 in W:H mode
    const btn = Array.from(btns).find((b) => b.getAttribute("aria-label") === "Set ratio to 1:2");
    expect(btn).not.toBeUndefined();
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe("2:1");
  });

  it("mode persists after re-sorting", () => {
    modeBtn().click(); // W:H mode
    const select = toolbar.querySelector<HTMLSelectElement>('select[aria-label="Sort aspect ratios"]')!;
    select.value = "commonality";
    select.dispatchEvent(new Event("change"));
    // Most common ratio 2:3 (H=2,W=3) → W/H = 3:2
    const firstBtn = toolbar.querySelector<HTMLButtonElement>(".toolbar-ratio-btn");
    expect(firstBtn?.textContent).toBe("3:2");
  });
});
