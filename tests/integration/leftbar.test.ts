import { describe, it, expect, beforeEach, vi } from "vitest";
import { createLeftbar } from "@/ui/leftbar";

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

  it("contains 5 tab buttons", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    expect(tabs.length).toBe(5);
  });

  it("tab buttons have correct labels", () => {
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    const labels = Array.from(tabs).map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Ratio", "Stripes", "Overlays", "Templates", "Symbols"]);
  });

  it("shows Ratio panel by default", () => {
    const heading = toolbar.querySelector("h3");
    expect(heading?.textContent).toMatch(/Aspect Ratio/i);
  });

  it("shows 7 aspect ratio buttons", () => {
    const ratioBtns = toolbar.querySelectorAll(".toolbar-ratio-btn");
    expect(ratioBtns.length).toBe(7);
  });

  it("2:3 ratio is active by default", () => {
    const activeBtn = toolbar.querySelector(".toolbar-ratio-btn.active");
    expect(activeBtn?.textContent).toBe("2:3");
  });

  it("clicking a ratio button updates active state", () => {
    const btns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-ratio-btn");
    const btn1x1 = Array.from(btns).find((b) => b.textContent === "1:1")!;
    btn1x1.click();
    expect(btn1x1.classList.contains("active")).toBe(true);
    const btn23 = Array.from(btns).find((b) => b.textContent === "2:3")!;
    expect(btn23.classList.contains("active")).toBe(false);
  });

  it("clicking ratio button emits toolbar:ratio event", () => {
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
    tabs[1].click();
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

  it("stripe count does not exceed 13", () => {
    const plusBtn = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-count-btn")[1];
    for (let i = 0; i < 15; i++) plusBtn.click();
    const label = toolbar.querySelector(".toolbar-count-label");
    expect(label?.textContent).toBe("13");
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

  beforeEach(() => {
    document.documentElement.className = "dark";
    document.body.innerHTML = "";
    toolbar = createLeftbar();
    document.body.appendChild(toolbar);
    const tabs = toolbar.querySelectorAll<HTMLButtonElement>(
      'nav[aria-label="Toolbar tabs"] button',
    );
    tabs[3].click(); // Templates
  });

  it("shows Division and National section titles", () => {
    const titles = toolbar.querySelectorAll(".toolbar-section-title");
    const texts = Array.from(titles).map((t) => t.textContent);
    expect(texts).toContain("Division");
    expect(texts).toContain("National");
  });

  it("renders template items with SVG thumbnails", () => {
    const items = toolbar.querySelectorAll(".toolbar-template-item");
    expect(items.length).toBeGreaterThanOrEqual(17);
    for (const item of items) {
      expect(item.querySelector("svg")).not.toBeNull();
    }
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
    tabs[4].click(); // Symbols
  });

  it("has a search input", () => {
    const search = toolbar.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).not.toBeNull();
    expect(search!.placeholder).toBe("Search symbols...");
  });

  it("renders all 10 builtin symbols", () => {
    const items = toolbar.querySelectorAll(".toolbar-symbol-item");
    expect(items.length).toBe(10);
  });

  it("filters symbols by search text", () => {
    const search = toolbar.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = "cross";
    search.dispatchEvent(new Event("input"));
    const items = toolbar.querySelectorAll(".toolbar-symbol-item");
    expect(items.length).toBe(2); // Greek Cross and Latin Cross
  });

  it("filters symbols by category", () => {
    const catBtns = toolbar.querySelectorAll<HTMLButtonElement>(".toolbar-cat-btn");
    const starsBtn = Array.from(catBtns).find((b) => b.textContent === "Stars")!;
    starsBtn.click();
    const items = toolbar.querySelectorAll(".toolbar-symbol-item");
    expect(items.length).toBe(2); // star5 and star6_hexagram
  });

  it("clicking a symbol emits toolbar:symbol event", () => {
    let detail: Record<string, unknown> | null = null;
    toolbar.addEventListener("toolbar:symbol", ((e: CustomEvent) => {
      detail = e.detail as Record<string, unknown>;
    }) as EventListener);

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
    tabs[2].click(); // Overlays
  });

  it("shows add overlay buttons for rectangle, circle, star", () => {
    const addBtns = toolbar.querySelectorAll(".toolbar-add-btn");
    expect(addBtns.length).toBe(3);
    const labels = Array.from(addBtns).map((b) => b.textContent);
    expect(labels).toEqual(["Rectangle", "Circle", "Star"]);
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
    tabs[1].click(); // Stripes
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
    tabs[4].click(); // Symbols
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
});
