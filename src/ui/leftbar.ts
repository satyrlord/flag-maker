/* ──────────────────────────────────────────────
   Flag Maker – Flag Editor (leftbar)
   Tabbed sidebar with flag editing controls:
   Ratio, Stripes, Overlays, Templates, Symbols.
   ────────────────────────────────────────────── */

import type { SymbolDef } from "../types";
import { BUILTIN_SYMBOLS } from "../symbols";
import { starPath } from "../utils";
import { VIEW_W, computeViewH } from "../geometry";
import { svg } from "./icons";
import { validateLeftbarConfig } from "./leftbarConfig";
import {
  type TemplateCfg,
  templatePerPale,
  templatePerFess,
  templateTricolorVertical,
  templateTricolorHorizontal,
  templateQuartered,
  templatePerBend,
  templatePerBendSinister,
  templatePerSaltire,
  templatePerChevron,
  templateCenteredCross,
  templateNordicCross,
  templateUS,
  templateIceland,
  templateUruguay,
  templateDRC,
  templateUK,
  templateSouthAfrica,
} from "../templates";
import config from "./leftbar-config.json";

/* ── Constants ── */

const NS = "http://www.w3.org/2000/svg";

/* ── Tab Icons (Lucide-style) ── */

type TabId = "ratio" | "stripes" | "overlays" | "templates" | "symbols";

const TabIcons: Record<TabId, string> = {
  ratio: svg(
    '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
      '<line x1="3" y1="12" x2="21" y2="12"/>' +
      '<line x1="12" y1="3" x2="12" y2="21"/>',
  ),
  stripes: svg(
    '<line x1="3" y1="6" x2="21" y2="6"/>' +
      '<line x1="3" y1="10" x2="21" y2="10"/>' +
      '<line x1="3" y1="14" x2="21" y2="14"/>' +
      '<line x1="3" y1="18" x2="21" y2="18"/>',
  ),
  overlays: svg(
    '<polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>' +
      '<line x1="12" y1="22" x2="12" y2="15.5"/>' +
      '<polyline points="22 8.5 12 15.5 2 8.5"/>',
  ),
  templates: svg(
    '<rect x="3" y="3" width="7" height="7"/>' +
      '<rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="14" y="14" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/>',
  ),
  symbols: svg(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 ' +
      '18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ),
};

/* ── Tab Definitions (derived from config keys + icons) ── */

interface TabDef {
  id: string;
  label: string;
  icon: string;
}

const TABS: TabDef[] = (Object.keys(TabIcons) as TabId[]).map((id) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  icon: TabIcons[id],
}));

/* ── Template Registry (maps config IDs to factory functions) ── */

interface TemplateEntry {
  id: string;
  name: string;
  group: string;
  create: () => TemplateCfg;
}

const TEMPLATE_FACTORIES: Record<string, () => TemplateCfg> = {
  perPale: templatePerPale,
  perFess: templatePerFess,
  triV: templateTricolorVertical,
  triH: templateTricolorHorizontal,
  quartered: templateQuartered,
  perBend: templatePerBend,
  perBendSin: templatePerBendSinister,
  saltire: templatePerSaltire,
  chevron: templatePerChevron,
  centCross: templateCenteredCross,
  nordic: templateNordicCross,
  us: () => {
    const r: [number, number] = [10, 19];
    return templateUS(VIEW_W, computeViewH(r));
  },
  iceland: templateIceland,
  uruguay: templateUruguay,
  drc: templateDRC,
  uk: templateUK,
  sa: templateSouthAfrica,
};

const TEMPLATE_CATALOG: TemplateEntry[] = config.templates.map((t) => ({
  ...t,
  create: TEMPLATE_FACTORIES[t.id],
}));

/* ── Common Aspect Ratios (from config) ── */

const RATIOS: { label: string; ratio: [number, number]; commonality: number }[] = config.ratios.map((r) => ({
  label: r.label,
  ratio: r.ratio as [number, number],
  commonality: r.commonality,
}));

type RatioEntry = (typeof RATIOS)[number];

export type RatioDisplayMode = "hw" | "wh" | "decimal";

const RATIO_MODES: RatioDisplayMode[] = ["hw", "wh", "decimal"];
const RATIO_MODE_LABELS: Record<RatioDisplayMode, string> = { hw: "H:W", wh: "W:H", decimal: "W/H" };
const TRAILING_ZEROS_PATTERN = /\.?0+$/;

/**
 * Formats an aspect ratio for display according to the given mode.
 * @param ratio - Tuple [height, width] representing the aspect ratio. Both values must be non-negative; callers must validate before passing (the config validator enforces this).
 * @param mode - Display mode: "hw" (H:W), "wh" (W:H), or "decimal" (W/H as a decimal number).
 * @returns A formatted string representing the ratio in the chosen mode.
 * @example
 * formatRatioDisplay([2, 3], "hw")      // "2:3"
 * formatRatioDisplay([2, 3], "wh")      // "3:2"
 * formatRatioDisplay([2, 3], "decimal") // "1.5"  (not "1.50" -- trailing zeros are stripped)
 * formatRatioDisplay([1, 2], "decimal") // "2"    (not "2.00")
 * formatRatioDisplay([0, 5], "decimal") // "\u221e"  (height=0 means W/H = Infinity)
 */
export function formatRatioDisplay(ratio: [number, number], mode: RatioDisplayMode): string {
  const [rh, rw] = ratio;
  if (mode === "hw") return `${rh}:${rw}`;
  if (mode === "wh") return `${rw}:${rh}`;
  if (rh === 0) return "\u221e"; // guard: rw / 0 = Infinity; display the infinity symbol
  const decimal = rw / rh;
  return Number.isInteger(decimal) ? String(decimal) : decimal.toFixed(2).replace(TRAILING_ZEROS_PATTERN, "");
}

function compareByAspectValue(a: RatioEntry, b: RatioEntry): number {
  return a.ratio[0] / a.ratio[1] - b.ratio[0] / b.ratio[1];
}

function compareByCommonality(a: RatioEntry, b: RatioEntry): number {
  return b.commonality - a.commonality;
}

/* ── Event Helper ── */

function emit(el: HTMLElement, name: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

/* ── DOM Helper ── */

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

/* ── Panel Header Icons (decorative, one per tab panel) ── */

const PanelIcons: Record<TabId, string> = {
  ratio: svg(
    '<rect x="4" y="6" width="16" height="12" rx="1" fill="none"/>' +
      '<line x1="4" y1="18" x2="20" y2="18"/>' +
      '<line x1="4" y1="6" x2="4" y2="18"/>' +
      '<path d="M6 20 L12 20" stroke-dasharray="1 1.5"/>' +
      '<path d="M2 8 L2 16" stroke-dasharray="1 1.5"/>',
    20,
  ),
  stripes: svg(
    '<rect x="3" y="4" width="18" height="3" rx="0.5" fill="currentColor" stroke="none"/>' +
      '<rect x="3" y="10" width="18" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/>' +
      '<rect x="3" y="16" width="18" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.3"/>',
    20,
  ),
  overlays: svg(
    '<rect x="3" y="6" width="10" height="10" rx="1"/>' +
      '<circle cx="16" cy="11" r="5"/>' +
      '<polygon points="12 3 14 7 10 7"/>',
    20,
  ),
  templates: svg(
    '<rect x="3" y="3" width="8" height="18" rx="1"/>' +
      '<rect x="13" y="3" width="8" height="18" rx="1"/>' +
      '<line x1="13" y1="12" x2="21" y2="12"/>',
    20,
  ),
  symbols: svg(
    '<circle cx="12" cy="10" r="4"/>' +
      '<path d="M12 2 L13.5 6.5 L18 6.5 L14.5 9.5 L16 14 L12 11 L8 14 L9.5 9.5 L6 6.5 L10.5 6.5 Z" fill="currentColor" stroke="none"/>' +
      '<path d="M7 18 C7 15 17 15 17 18" fill="none"/>',
    20,
  ),
};

function sectionTitle(text: string): HTMLElement {
  const t = h("h3", "toolbar-section-title", text);
  t.style.color = "var(--text-secondary)";
  return t;
}

function panelHeader(text: string, tabId: TabId): HTMLElement {
  const row = h("div", "toolbar-panel-header");
  const title = sectionTitle(text);
  title.style.margin = "0";
  row.appendChild(title);
  const iconMarkup = PanelIcons[tabId];
  if (iconMarkup) {
    const span = h("span", "toolbar-panel-icon");
    span.innerHTML = iconMarkup;
    row.appendChild(span);
  }
  return row;
}

/* ── Template Thumbnail ── */

function templateThumbnail(cfg: TemplateCfg, thumbH = 28): SVGSVGElement {
  const [rh, rw] = cfg.ratio;
  const aspect = rw / rh;
  const thumbW = Math.round(thumbH * aspect);

  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${thumbW} ${thumbH}`);
  s.setAttribute("width", String(thumbW));
  s.setAttribute("height", String(thumbH));
  s.style.borderRadius = "2px";
  s.style.border = "1px solid var(--divider)";
  s.style.flexShrink = "0";

  // Draw base stripes
  const n = cfg.sections;
  const weights = cfg.weights ?? Array.from<number>({ length: n }).fill(1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    const frac = weights[i] / totalWeight;
    const rect = document.createElementNS(NS, "rect");
    if (cfg.orientation === "vertical") {
      rect.setAttribute("x", String(Math.round(offset * thumbW)));
      rect.setAttribute("y", "0");
      rect.setAttribute("width", String(Math.ceil(frac * thumbW)));
      rect.setAttribute("height", String(thumbH));
    } else {
      rect.setAttribute("x", "0");
      rect.setAttribute("y", String(Math.round(offset * thumbH)));
      rect.setAttribute("width", String(thumbW));
      rect.setAttribute("height", String(Math.ceil(frac * thumbH)));
    }
    rect.setAttribute("fill", cfg.colors[i] ?? "#ccc");
    s.appendChild(rect);
    offset += frac;
  }

  // Draw rectangle overlays (simplified)
  for (const ov of cfg.overlays) {
    if (ov.type === "rectangle") {
      const rect = document.createElementNS(NS, "rect");
      const rx = ((ov.x - ov.w / 2) / 100) * thumbW;
      const ry = ((ov.y - ov.h / 2) / 100) * thumbH;
      const rw2 = (ov.w / 100) * thumbW;
      const rh2 = (ov.h / 100) * thumbH;
      rect.setAttribute("x", String(rx));
      rect.setAttribute("y", String(ry));
      rect.setAttribute("width", String(rw2));
      rect.setAttribute("height", String(rh2));
      rect.setAttribute("fill", ov.fill);
      if (ov.rotation) {
        const cx = rx + rw2 / 2;
        const cy = ry + rh2 / 2;
        rect.setAttribute(
          "transform",
          `rotate(${ov.rotation} ${cx} ${cy})`,
        );
      }
      s.appendChild(rect);
    } else if (ov.type === "custom" && ov.path) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", ov.path);
      path.setAttribute("fill", ov.fill);
      path.setAttribute(
        "transform",
        `scale(${thumbW / 100} ${thumbH / 100})`,
      );
      s.appendChild(path);
    }
  }

  return s;
}

/* ── Symbol Preview ── */

function symbolPreview(sym: SymbolDef, size = 32): SVGSVGElement {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", sym.viewBox ?? "0 0 100 100");
  s.setAttribute("width", String(size));
  s.setAttribute("height", String(size));
  s.style.color = "var(--text-primary)";

  if (sym.path) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", sym.path);
    p.setAttribute("fill", "currentColor");
    s.appendChild(p);
  } else if (sym.generator === "star5") {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", starPath(50, 50, 40, 16));
    p.setAttribute("fill", "currentColor");
    s.appendChild(p);
  }

  return s;
}

/* ──────────────────────────────────────────────
   Panel Builders
   ────────────────────────────────────────────── */

function createRatioPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");

  // Build panel header manually to inject the mode toggle between title and icon
  let ratioDisplayMode: RatioDisplayMode = "hw";
  const header = h("div", "toolbar-panel-header");
  const headerTitle = sectionTitle("Aspect Ratio");
  headerTitle.style.margin = "0";
  const modeBtn = h("button", "toolbar-ratio-mode-btn", RATIO_MODE_LABELS[ratioDisplayMode]);
  modeBtn.type = "button";
  modeBtn.setAttribute("aria-label", "Toggle aspect ratio display mode");
  modeBtn.title = "Toggle display: H/W, W/H, decimal";
  const panelIconSpan = h("span", "toolbar-panel-icon");
  panelIconSpan.innerHTML = PanelIcons.ratio;
  header.append(headerTitle, modeBtn, panelIconSpan);
  panel.appendChild(header);

  // Sort control
  const sortRow = h("div", "toolbar-sort-row");
  const sortLabel = h("label", "toolbar-sort-label text-xs", "Sort by");
  sortLabel.style.color = "var(--text-secondary)";
  const sortSelect = document.createElement("select");
  sortSelect.className = "toolbar-sort-select";
  sortSelect.setAttribute("aria-label", "Sort aspect ratios");
  for (const opt of [
    { value: "commonality", text: "Commonality" },
    { value: "value", text: "Value" },
  ]) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.text;
    sortSelect.appendChild(o);
  }
  sortRow.append(sortLabel, sortSelect);
  panel.appendChild(sortRow);

  const grid = h("div", "toolbar-ratio-grid");
  let activeLabel = config.defaultRatio;

  function sortedRatios(): typeof RATIOS {
    const sorted = [...RATIOS];
    sorted.sort(
      sortSelect.value === "commonality" ? compareByCommonality : compareByAspectValue,
    );
    return sorted;
  }

  function rebuildGrid(): void {
    grid.innerHTML = "";
    for (const r of sortedRatios()) {
      const displayText = formatRatioDisplay(r.ratio, ratioDisplayMode);
      const btn = h("button", "toolbar-ratio-btn", displayText);
      btn.type = "button";
      btn.setAttribute("aria-label", `Set ratio to ${r.label}`);
      btn.addEventListener("click", () => {
        activeLabel = r.label;
        grid
          .querySelectorAll(".toolbar-ratio-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        emit(root, "toolbar:ratio", { ratio: r.ratio });
      });
      if (r.label === activeLabel) btn.classList.add("active");
      grid.appendChild(btn);
    }
  }

  modeBtn.addEventListener("click", () => {
    const idx = RATIO_MODES.indexOf(ratioDisplayMode);
    ratioDisplayMode = RATIO_MODES[(idx + 1) % RATIO_MODES.length];
    modeBtn.textContent = RATIO_MODE_LABELS[ratioDisplayMode];
    rebuildGrid();
  });

  sortSelect.addEventListener("change", rebuildGrid);
  rebuildGrid();
  panel.appendChild(grid);
  return panel;
}

function createStripesPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Stripes", "stripes"));

  // Orientation toggle
  panel.appendChild(sectionTitle("Orientation"));
  const orientRow = h("div", "toolbar-orient-row");
  const btnH = h("button", "toolbar-orient-btn active", "Horizontal");
  btnH.type = "button";
  const btnV = h("button", "toolbar-orient-btn", "Vertical");
  btnV.type = "button";

  function setOrient(o: "horizontal" | "vertical"): void {
    btnH.classList.toggle("active", o === "horizontal");
    btnV.classList.toggle("active", o === "vertical");
    emit(root, "toolbar:orientation", { orientation: o });
  }
  btnH.addEventListener("click", () => setOrient("horizontal"));
  btnV.addEventListener("click", () => setOrient("vertical"));
  orientRow.append(btnH, btnV);
  panel.appendChild(orientRow);

  // Stripe count
  panel.appendChild(sectionTitle("Stripe Count"));
  const countRow = h("div", "toolbar-count-row");
  let count = config.stripes.defaultCount;
  const countLabel = h("span", "toolbar-count-label", String(count));
  countLabel.style.color = "var(--text-primary)";
  const btnMinus = h("button", "toolbar-count-btn", "\u2212");
  btnMinus.type = "button";
  btnMinus.setAttribute("aria-label", "Decrease stripe count");
  const btnPlus = h("button", "toolbar-count-btn", "+");
  btnPlus.type = "button";
  btnPlus.setAttribute("aria-label", "Increase stripe count");

  const DEFAULT_COLORS = config.stripes.defaultColors;

  const colorContainer = h("div", "toolbar-color-list");
  const currentColors: string[] = DEFAULT_COLORS.slice(0, count);

  function rebuildColorPickers(): void {
    colorContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const row = h("div", "toolbar-color-row");
      const label = h("span", "toolbar-color-label text-xs", `${i + 1}`);
      label.style.color = "var(--text-secondary)";
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = currentColors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      picker.className = "toolbar-color-picker";
      picker.setAttribute("aria-label", `Stripe ${i + 1} color`);
      picker.addEventListener("input", () => {
        currentColors[i] = picker.value;
        emit(root, "toolbar:color", { index: i, color: picker.value });
      });
      row.append(label, picker);
      colorContainer.appendChild(row);
    }
  }

  function updateCount(n: number): void {
    count = Math.max(config.stripes.minCount, Math.min(config.stripes.maxCount, n));
    countLabel.textContent = String(count);
    emit(root, "toolbar:stripes", { count });
    rebuildColorPickers();
  }
  btnMinus.addEventListener("click", () => updateCount(count - 1));
  btnPlus.addEventListener("click", () => updateCount(count + 1));
  countRow.append(btnMinus, countLabel, btnPlus);
  panel.appendChild(countRow);

  // Colors
  panel.appendChild(sectionTitle("Colors"));
  rebuildColorPickers();
  panel.appendChild(colorContainer);

  // Listen for external color changes (e.g. template applied)
  root.addEventListener("toolbar:sync-colors", ((e: Event) => {
    const { colors } = (e as CustomEvent<{ colors: string[] }>).detail;
    count = colors.length;
    countLabel.textContent = String(count);
    currentColors.length = 0;
    currentColors.push(...colors);
    rebuildColorPickers();
  }) as EventListener);

  return panel;
}

function createOverlaysPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Overlays", "overlays"));
  panel.appendChild(sectionTitle("Add Overlay"));

  const addRow = h("div", "toolbar-add-row");
  for (const t of config.overlayTypes) {
    const btn = h("button", "toolbar-add-btn", t.label);
    btn.type = "button";
    btn.setAttribute("aria-label", `Add ${t.label} overlay`);
    btn.addEventListener("click", () => {
      emit(root, "toolbar:add-overlay", { type: t.id });
    });
    addRow.appendChild(btn);
  }
  panel.appendChild(addRow);

  panel.appendChild(sectionTitle("Layer List"));
  const list = h("div", "toolbar-overlay-list");
  const empty = h("p", "toolbar-empty-text", "No overlays yet");
  empty.style.color = "var(--text-secondary)";
  list.appendChild(empty);
  panel.appendChild(list);

  return panel;
}

function createTemplatesPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Templates", "templates"));
  const groups = config.templateGroups;

  for (const group of groups) {
    panel.appendChild(sectionTitle(group));
    const grid = h("div", "toolbar-template-grid");
    const entries = TEMPLATE_CATALOG.filter((t) => t.group === group);
    for (const entry of entries) {
      const item = h("button", "toolbar-template-item");
      item.type = "button";
      item.setAttribute("aria-label", `Apply ${entry.name} template`);
      const cfg = entry.create();
      const thumb = templateThumbnail(cfg);
      const name = h("span", "toolbar-template-name text-xs", entry.name);
      name.style.color = "var(--text-secondary)";
      item.append(thumb, name);
      item.addEventListener("click", () => {
        emit(root, "toolbar:template", { id: entry.id, config: cfg });
      });
      grid.appendChild(item);
    }
    panel.appendChild(grid);
  }

  return panel;
}

function createSymbolsPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Symbols", "symbols"));

  // Search input
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search symbols...";
  search.className = "toolbar-search";
  search.setAttribute("aria-label", "Search symbols");
  panel.appendChild(search);

  // Category filter tabs
  const categories = [
    "All",
    ...new Set(BUILTIN_SYMBOLS.map((s) => s.category)),
  ];
  const catRow = h("div", "toolbar-cat-row");
  let activeCat = "All";
  for (const cat of categories) {
    const btn = h("button", "toolbar-cat-btn", cat);
    btn.type = "button";
    if (cat === "All") btn.classList.add("active");
    btn.addEventListener("click", () => {
      activeCat = cat;
      catRow
        .querySelectorAll(".toolbar-cat-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
    });
    catRow.appendChild(btn);
  }
  panel.appendChild(catRow);

  // Symbol grid
  const grid = h("div", "toolbar-symbol-grid");
  panel.appendChild(grid);

  function renderGrid(): void {
    grid.innerHTML = "";
    const query = search.value.toLowerCase();
    const filtered = BUILTIN_SYMBOLS.filter((s) => {
      if (activeCat !== "All" && s.category !== activeCat) return false;
      if (query && !s.name.toLowerCase().includes(query)) return false;
      return true;
    });
    for (const sym of filtered) {
      const item = h("button", "toolbar-symbol-item");
      item.type = "button";
      item.title = sym.name;
      item.setAttribute("aria-label", `Add ${sym.name}`);
      item.appendChild(symbolPreview(sym));
      item.addEventListener("click", () => {
        emit(root, "toolbar:symbol", { symbolId: sym.id });
      });
      grid.appendChild(item);
    }
    if (filtered.length === 0) {
      const noResults = h("p", "toolbar-empty-text text-xs", "No symbols found");
      noResults.style.color = "var(--text-secondary)";
      grid.appendChild(noResults);
    }
  }

  search.addEventListener("input", renderGrid);
  renderGrid();

  return panel;
}

/* ──────────────────────────────────────────────
   Main Flag Editor (leftbar)
   ────────────────────────────────────────────── */

export function createLeftbar(): HTMLElement {
  validateLeftbarConfig(config, TEMPLATE_FACTORIES);
  const aside = document.createElement("aside");
  aside.className = "toolbar relative flex";
  aside.style.backgroundColor = "var(--toolbar-bg)";
  aside.style.borderRight = "1px solid var(--divider)";

  // ── Tab strip ──
  const strip = h("nav", "toolbar-strip flex flex-col items-center gap-0.5 py-2 shrink-0");
  strip.style.width = "48px";
  strip.style.borderRight = "1px solid var(--divider)";
  strip.setAttribute("aria-label", "Toolbar tabs");

  // ── Panel container ──
  const panelContainer = h("div", "toolbar-panel");
  panelContainer.style.backgroundColor = "var(--toolbar-bg)";

  // ── Build panels ──
  const panels: Record<string, HTMLElement> = {
    ratio: createRatioPanel(aside),
    stripes: createStripesPanel(aside),
    overlays: createOverlaysPanel(aside),
    templates: createTemplatesPanel(aside),
    symbols: createSymbolsPanel(aside),
  };

  // ── State ──
  let activeTab = "ratio";
  let panelOpen = false;
  const desktopMQ = window.matchMedia("(min-width: 1280px)");

  // ── Tab buttons ──
  const tabButtons: Record<string, HTMLButtonElement> = {};
  for (const tab of TABS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = tab.label;
    btn.setAttribute("aria-label", tab.label);
    btn.className =
      "toolbar-tab-btn flex items-center justify-center " +
      "w-9 h-9 rounded-md cursor-pointer transition-colors";
    btn.innerHTML = tab.icon;
    if (tab.id === activeTab) btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (!desktopMQ.matches) {
        if (activeTab === tab.id && panelOpen) {
          closePanel();
          return;
        }
        openPanel();
      }
      switchTab(tab.id);
    });
    tabButtons[tab.id] = btn;
    strip.appendChild(btn);
  }

  // ── Backdrop (mobile panel close-on-outside-tap) ──
  const backdrop = h("div", "toolbar-backdrop");
  backdrop.addEventListener("click", closePanel);

  // ── Panel switching ──
  function switchTab(id: string): void {
    activeTab = id;
    for (const [tabId, btn] of Object.entries(tabButtons)) {
      btn.classList.toggle("active", tabId === id);
    }
    panelContainer.innerHTML = "";
    const p = panels[id];
    if (p) panelContainer.appendChild(p);
  }

  function openPanel(): void {
    panelOpen = true;
    panelContainer.classList.add("panel-open");
    aside.appendChild(backdrop);
    backdrop.classList.add("backdrop-open");
  }

  function closePanel(): void {
    panelOpen = false;
    panelContainer.classList.remove("panel-open");
    backdrop.classList.remove("backdrop-open");
    if (backdrop.parentElement) backdrop.remove();
  }

  // ── Responsive ──
  function handleResize(): void {
    if (desktopMQ.matches) {
      panelOpen = true;
      panelContainer.classList.remove("panel-open");
      if (backdrop.parentElement) backdrop.remove();
    } else {
      closePanel();
    }
  }
  desktopMQ.addEventListener("change", handleResize);

  // ── Initial setup ──
  switchTab(activeTab);
  if (desktopMQ.matches) panelOpen = true;

  aside.append(strip, panelContainer);
  return aside;
}
