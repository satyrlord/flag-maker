/* ──────────────────────────────────────────────
   Flag Maker – Flag Editor (leftbar)
   Tabbed sidebar with flag editing controls:
   Templates, Aspect Ratio, Stripes, Overlays, Symbols, Saved.
   ────────────────────────────────────────────── */

import type { SymbolDef, Overlay } from "../types";
import { LAYER_GROUP_CONSTRAINTS, overlayLayerGroup, collectSymbolIds } from "../types";
import {
  BUILTIN_SYMBOL_CATEGORIES,
  getLoadedBuiltinSymbols,
  isBuiltinSymbolCategoryLoaded,
  loadBuiltinSymbolsForCategory,
  ensureBuiltinSymbolsByIds,
} from "../symbols";
import { getAllSymbols } from "../symbolLoader";

import {
  svg,
  ICON_EYE,
  ICON_EYE_OFF,
  ICON_LOCK,
  ICON_UNLOCK,
  ICON_TRASH,
  ICON_MOVE_UP,
  ICON_MOVE_DOWN,
} from "./icons";
import {
  panelHeader,
  sectionTitle,
  symbolPreview,
  templateStaticPreview,
  templateThumbnail,
} from "./leftbarRenderHelpers";
import { validateLeftbarConfig } from "./leftbarConfig";
import { type TemplateCfg } from "../templates";
import { ALL_TEMPLATE_FACTORIES, TEMPLATE_CATALOG, TEMPLATE_GROUPED_CONFIGS, validateTemplateCatalog } from "../templateCatalog";
import config from "@/config/leftbar-config.json";

/* ── Constants ── */

const DEFAULT_OPEN_TEMPLATE_GROUP = "Division";

/* ── Tab Icons (Lucide-style) ── */

type TabId = "ratio" | "stripes" | "overlays" | "starfield" | "templates" | "symbols" | "saved";

const DEFAULT_ACTIVE_TAB: TabId = "templates";

const TabIcons: Record<TabId, string> = {
  templates: svg(
    '<rect x="3" y="3" width="7" height="7"/>' +
      '<rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="14" y="14" width="7" height="7"/>' +
      '<rect x="3" y="14" width="7" height="7"/>',
  ),
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
  symbols: svg(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 ' +
      '18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ),
  starfield: svg(
    '<polygon points="8 3 9.5 6.5 13 7 10.5 9.5 11 13 8 11 5 13 5.5 9.5 3 7 6.5 6.5"/>' +
    '<polygon points="18 10 19 12.5 21.5 12.5 19.5 14.5 20 17 18 15.5 16 17 16.5 14.5 14.5 12.5 17 12.5"/>',
  ),
  saved: svg(
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  ),
};

/* ── Tab Strip (ordered tabs + separators) ── */

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

interface TabSeparator {
  separator: true;
}

type TabStripItem = TabDef | TabSeparator;

const TAB_STRIP: TabStripItem[] = [
  { id: "templates", label: "Templates", icon: TabIcons.templates },
  { id: "ratio", label: "Aspect Ratio", icon: TabIcons.ratio },
  { separator: true },
  { id: "stripes", label: "Stripes", icon: TabIcons.stripes },
  { id: "overlays", label: "Overlays", icon: TabIcons.overlays },
  { id: "starfield", label: "Starfield", icon: TabIcons.starfield },
  { id: "symbols", label: "Symbols", icon: TabIcons.symbols },
  { separator: true },
  { id: "saved", label: "Saved", icon: TabIcons.saved },
];

/* ── Template Registry (maps config IDs to factory functions) ── */

/* ── Common Aspect Ratios (from config) ── */

const RATIOS: { label: string; ratio: [number, number]; commonality: number }[] = config.ratios.map((r) => ({
  label: r.label,
  ratio: r.ratio as [number, number],
  commonality: r.commonality,
}));

type RatioEntry = (typeof RATIOS)[number];

type RatioDisplayMode = "hw" | "wh" | "decimal";

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
  starfield: svg(
    '<polygon points="8 3 9.5 6.5 13 7 10.5 9.5 11 13 8 11 5 13 5.5 9.5 3 7 6.5 6.5" fill="currentColor" stroke="none"/>' +
    '<polygon points="18 10 19 12.5 21.5 12.5 19.5 14.5 20 17 18 15.5 16 17 16.5 14.5 14.5 12.5 17 12.5" fill="currentColor" stroke="none"/>',
    20,
  ),
  saved: svg(
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
      '<line x1="15" y1="8" x2="9" y2="8"/>',
    20,
  ),
};

/* ──────────────────────────────────────────────
   Layer Row Builder
   ────────────────────────────────────────────── */

const OVERLAY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  config.overlayTypes.map((t) => [t.id, t.shortLabel]),
);

function createLayerRow(
  root: HTMLElement,
  ov: Overlay,
  index: number,
  group: "overlays" | "symbols",
  totalInGroup: number,
): HTMLElement {
  const row = h("div", "toolbar-layer-row");
  row.setAttribute("data-layer-id", ov.id);

  // ── Top sub-row: swatch + label + color picker ──
  const topRow = h("div", "toolbar-layer-top");

  // Color swatch / type indicator
  const swatch = h("span", "toolbar-layer-swatch");
  swatch.style.backgroundColor = ov.fill;
  topRow.appendChild(swatch);

  // Label
  const label = h("span", "toolbar-layer-label text-xs");
  const typeLabel = OVERLAY_TYPE_LABELS[ov.type] ?? ov.type;
  if (ov.type === "symbol" && ov.symbolId) {
    label.textContent = ov.symbolId;
    label.title = `Symbol: ${ov.symbolId}`;
  } else {
    label.textContent = `${typeLabel} ${index + 1}`;
  }
  topRow.appendChild(label);

  // Color picker
  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = ov.fill;
  colorPicker.className = "toolbar-layer-color";
  colorPicker.setAttribute("aria-label", "Layer fill color");
  colorPicker.addEventListener("input", () => {
    swatch.style.backgroundColor = colorPicker.value;
    emit(root, "toolbar:layer-color", { id: ov.id, fill: colorPicker.value });
  });
  topRow.appendChild(colorPicker);

  row.appendChild(topRow);

  // ── Bottom sub-row: action buttons ──
  const btnRow = h("div", "toolbar-layer-actions");

  // Visibility toggle
  const visBtn = document.createElement("button");
  visBtn.type = "button";
  visBtn.className = "toolbar-layer-btn";
  const isVisible = ov.visible === undefined || ov.visible === true;
  visBtn.innerHTML = isVisible ? ICON_EYE : ICON_EYE_OFF;
  visBtn.setAttribute("aria-label", isVisible ? "Hide layer" : "Show layer");
  visBtn.title = isVisible ? "Hide" : "Show";
  if (!isVisible) visBtn.style.opacity = "0.4";
  visBtn.addEventListener("click", () => {
    emit(root, "toolbar:layer-visibility", { id: ov.id, visible: !isVisible });
  });
  btnRow.appendChild(visBtn);

  // Lock toggle
  const lockBtn = document.createElement("button");
  lockBtn.type = "button";
  lockBtn.className = "toolbar-layer-btn";
  const isLocked = ov.locked === true;
  lockBtn.innerHTML = isLocked ? ICON_LOCK : ICON_UNLOCK;
  lockBtn.setAttribute("aria-label", isLocked ? "Unlock layer" : "Lock layer");
  lockBtn.title = isLocked ? "Unlock" : "Lock";
  if (isLocked) lockBtn.style.opacity = "0.7";
  lockBtn.addEventListener("click", () => {
    emit(root, "toolbar:layer-lock", { id: ov.id, locked: !isLocked });
  });
  btnRow.appendChild(lockBtn);

  // Move up
  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "toolbar-layer-btn";
  upBtn.innerHTML = ICON_MOVE_UP;
  upBtn.setAttribute("aria-label", "Move layer up");
  upBtn.title = "Move up";
  upBtn.disabled = index >= totalInGroup - 1;
  if (upBtn.disabled) upBtn.style.opacity = "0.25";
  upBtn.addEventListener("click", () => {
    emit(root, "toolbar:layer-move", { id: ov.id, direction: "up" });
  });
  btnRow.appendChild(upBtn);

  // Move down
  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "toolbar-layer-btn";
  downBtn.innerHTML = ICON_MOVE_DOWN;
  downBtn.setAttribute("aria-label", "Move layer down");
  downBtn.title = "Move down";
  downBtn.disabled = index <= 0;
  if (downBtn.disabled) downBtn.style.opacity = "0.25";
  downBtn.addEventListener("click", () => {
    emit(root, "toolbar:layer-move", { id: ov.id, direction: "down" });
  });
  btnRow.appendChild(downBtn);

  // Delete
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "toolbar-layer-btn toolbar-layer-btn-danger";
  delBtn.innerHTML = ICON_TRASH;
  delBtn.setAttribute("aria-label", "Delete layer");
  delBtn.title = "Delete";
  delBtn.addEventListener("click", () => {
    emit(root, "toolbar:layer-remove", { id: ov.id });
  });
  btnRow.appendChild(delBtn);

  row.appendChild(btnRow);

  return row;
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
  const modeBtn = h("button", "btn btn-ghost btn-xs toolbar-ratio-mode-btn", RATIO_MODE_LABELS[ratioDisplayMode]);
  modeBtn.type = "button";
  modeBtn.setAttribute("aria-label", "Toggle aspect ratio display mode");
  modeBtn.title = "Toggle display: H/W, W/H, decimal";
  const panelIconSpan = h("span", "toolbar-panel-icon");
  panelIconSpan.innerHTML = PanelIcons.ratio;
  header.append(headerTitle, modeBtn, panelIconSpan);
  panel.appendChild(header);

  // Sort control
  const sortRow = h("div", "toolbar-sort-row");
  const sortLabel = h("label", "toolbar-sort-label text-xs text-secondary", "Sort by");
  const sortSelect = document.createElement("select");
  sortSelect.className = "select select-sm select-ghost w-full";
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
      const btn = h("button", "btn btn-outline btn-xs toolbar-ratio-btn", displayText);
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
  panel.appendChild(panelHeader("Stripes", PanelIcons.stripes));

  // Orientation toggle
  panel.appendChild(sectionTitle("Orientation"));
  const orientRow = h("div", "toolbar-orient-row");
  const btnH = h("button", "join-item btn btn-outline btn-xs active toolbar-orient-btn", "Horizontal");
  btnH.type = "button";
  const btnV = h("button", "join-item btn btn-outline btn-xs toolbar-orient-btn", "Vertical");
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
  const countLabel = h("span", "toolbar-count-label text-base-content", String(count));
  const btnMinus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "\u2212");
  btnMinus.type = "button";
  btnMinus.setAttribute("aria-label", "Decrease stripe count");
  const btnPlus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "+");
  btnPlus.type = "button";
  btnPlus.setAttribute("aria-label", "Increase stripe count");

  const DEFAULT_COLORS = config.stripes.defaultColors;

  const colorContainer = h("div", "toolbar-color-list");
  const currentColors: string[] = DEFAULT_COLORS.slice(0, count);

  function syncStripeControls(colors: string[], orientation?: "horizontal" | "vertical"): void {
    count = colors.length;
    countLabel.textContent = String(count);
    currentColors.length = 0;
    currentColors.push(...colors);
    if (orientation) {
      btnH.classList.toggle("active", orientation === "horizontal");
      btnV.classList.toggle("active", orientation === "vertical");
    }
    rebuildColorPickers();
  }

  function rebuildColorPickers(): void {
    colorContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const row = h("div", "toolbar-color-row");
      const label = h("span", "toolbar-color-label text-xs text-secondary", `${i + 1}`);
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
    syncStripeControls(colors);
  }) as EventListener);

  root.addEventListener("toolbar:sync-stripes", ((e: Event) => {
    const { colors, orientation } = (e as CustomEvent<{
      colors: string[];
      orientation: "horizontal" | "vertical";
    }>).detail;
    syncStripeControls(colors, orientation);
  }) as EventListener);

  return panel;
}

function createOverlaysPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Overlays", PanelIcons.overlays));

  // Count display
  const maxOverlays = LAYER_GROUP_CONSTRAINTS.overlays.maxLayers;
  const countInfo = h("div", "toolbar-layer-count text-xs text-secondary mb-1.5");
  panel.appendChild(countInfo);

  panel.appendChild(sectionTitle("Add Overlay"));
  const addRow = h("div", "toolbar-add-row");
  const addButtons: HTMLButtonElement[] = [];
  for (const t of config.overlayTypes) {
    const btn = h("button", "btn btn-outline btn-xs toolbar-add-btn", t.label);
    btn.type = "button";
    btn.setAttribute("aria-label", `Add ${t.label} overlay`);
    btn.addEventListener("click", () => {
      emit(root, "toolbar:add-overlay", { type: t.id });
    });
    addRow.appendChild(btn);
    addButtons.push(btn);
  }
  panel.appendChild(addRow);

  panel.appendChild(sectionTitle("Layer List"));
  const list = h("div", "toolbar-overlay-list");
  panel.appendChild(list);

  let currentOverlays: Overlay[] = [];

  function updateCountInfo(): void {
    const count = currentOverlays.length;
    countInfo.textContent = `${count} / ${maxOverlays} layers`;
    const atMax = count >= maxOverlays;
    for (const btn of addButtons) {
      btn.disabled = atMax;
      btn.style.opacity = atMax ? "0.4" : "";
    }
  }

  function renderLayerList(): void {
    list.innerHTML = "";
    if (currentOverlays.length === 0) {
      const empty = h("p", "toolbar-empty-text text-xs text-secondary", "No overlays yet");
      list.appendChild(empty);
      updateCountInfo();
      return;
    }
    // Show layers in reverse order (top-most first)
    for (let i = currentOverlays.length - 1; i >= 0; i--) {
      const ov = currentOverlays[i];
      list.appendChild(createLayerRow(root, ov, i, "overlays", currentOverlays.length));
    }
    updateCountInfo();
  }

  root.addEventListener("toolbar:sync-layers", ((e: Event) => {
    const { overlays } = (e as CustomEvent<{ overlays: Overlay[] }>).detail;
    currentOverlays = overlays.filter((o) => overlayLayerGroup(o) === "overlays");
    renderLayerList();
  }) as EventListener);

  updateCountInfo();
  renderLayerList();
  return panel;
}

function createStarfieldPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Starfield", PanelIcons.starfield));

  const sfConfig = config.starfield;
  const maxStarfields = LAYER_GROUP_CONSTRAINTS.starfields.maxLayers;
  const countInfo = h("div", "toolbar-layer-count text-xs text-secondary mb-1.5");
  panel.appendChild(countInfo);

  // Add button
  const addBtn = h("button", "btn btn-primary btn-sm w-full mb-3", "+ Add starfield");
  addBtn.type = "button";
  addBtn.setAttribute("aria-label", "Add starfield overlay");
  addBtn.addEventListener("click", () => {
    emit(root, "toolbar:add-starfield", {});
  });
  panel.appendChild(addBtn);

  // Layer list
  const list = h("div", "toolbar-overlay-list mb-3");
  panel.appendChild(list);

  // Properties section (hidden until a starfield exists)
  const propsSection = h("div", "toolbar-starfield-props");
  propsSection.style.display = "none";

  let currentStarfields: Overlay[] = [];
  let selectedId: string | null = null;

  function getSelected(): Overlay | undefined {
    if (selectedId) return currentStarfields.find((o) => o.id === selectedId);
    return currentStarfields[currentStarfields.length - 1];
  }

  // ── Distribution ──
  propsSection.appendChild(sectionTitle("Distribution"));
  const distSelect = document.createElement("select");
  distSelect.className = "select select-sm select-bordered w-full mb-2";
  distSelect.setAttribute("aria-label", "Star distribution pattern");
  for (const d of sfConfig.distributions) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.label;
    distSelect.appendChild(opt);
  }
  distSelect.value = sfConfig.defaultDistribution;
  distSelect.addEventListener("change", () => {
    const sel = getSelected();
    /* istanbul ignore next */
    if (sel) emit(root, "toolbar:starfield-update", { id: sel.id, props: { starDistribution: distSelect.value } });
  });
  propsSection.appendChild(distSelect);

  // ── Number of stars ──
  propsSection.appendChild(sectionTitle("Number of stars"));
  const countRow = h("div", "toolbar-count-row");
  const starCountLabel = h("span", "toolbar-count-label text-base-content", String(sfConfig.defaultStarCount));
  const countBtnMinus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "\u2212");
  countBtnMinus.type = "button";
  countBtnMinus.setAttribute("aria-label", "Decrease star count");
  const countBtnPlus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "+");
  countBtnPlus.type = "button";
  countBtnPlus.setAttribute("aria-label", "Increase star count");
  countBtnMinus.addEventListener("click", () => {
    const sel = getSelected();
    /* istanbul ignore next */
    if (sel) {
      const next = Math.max(sfConfig.minStarCount, (sel.starCount ?? sfConfig.defaultStarCount) - 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starCount: next } });
    }
  });
  countBtnPlus.addEventListener("click", () => {
    const sel = getSelected();
    /* istanbul ignore next */
    if (sel) {
      const next = Math.min(sfConfig.maxStarCount, (sel.starCount ?? sfConfig.defaultStarCount) + 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starCount: next } });
    }
  });
  countRow.append(countBtnMinus, starCountLabel, countBtnPlus);
  propsSection.appendChild(countRow);

  // ── Columns (for grid/staggered-grid) ──
  const colsSection = h("div", "toolbar-starfield-cols mb-2");
  colsSection.appendChild(sectionTitle("Columns"));
  const colsRow = h("div", "toolbar-count-row");
  const colsLabel = h("span", "toolbar-count-label text-base-content", "6");
  const colsBtnMinus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "\u2212");
  colsBtnMinus.type = "button";
  colsBtnMinus.setAttribute("aria-label", "Decrease column count");
  const colsBtnPlus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "+");
  colsBtnPlus.type = "button";
  colsBtnPlus.setAttribute("aria-label", "Increase column count");
  colsBtnMinus.addEventListener("click", () => {
    const sel = getSelected();
    /* istanbul ignore next */
    if (sel) {
      const next = Math.max(2, (sel.starCols ?? 6) - 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starCols: next } });
    }
  });
  colsBtnPlus.addEventListener("click", () => {
    const sel = getSelected();
    /* istanbul ignore next */
    if (sel) {
      const next = Math.min(20, (sel.starCols ?? 6) + 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starCols: next } });
    }
  });
  colsRow.append(colsBtnMinus, colsLabel, colsBtnPlus);
  colsSection.appendChild(colsRow);
  propsSection.appendChild(colsSection);

  // ── Rotate with position checkbox ──
  const rotateRow = h("div", "flex items-center gap-2 mb-2");
  const rotateCheckbox = document.createElement("input");
  rotateCheckbox.type = "checkbox";
  rotateCheckbox.className = "checkbox checkbox-sm";
  rotateCheckbox.id = "sf-rotate";
  rotateCheckbox.setAttribute("aria-label", "Rotate stars with position");
  const rotateLabel = document.createElement("label");
  rotateLabel.htmlFor = "sf-rotate";
  rotateLabel.className = "text-xs cursor-pointer";
  rotateLabel.textContent = "Rotate stars with position";
  rotateCheckbox.addEventListener("change", () => {
    const sel = getSelected();
    if (sel) emit(root, "toolbar:starfield-update", { id: sel.id, props: { starRotateWithPosition: rotateCheckbox.checked } });
  });
  rotateRow.append(rotateCheckbox, rotateLabel);
  propsSection.appendChild(rotateRow);

  // ── Star Shape ──
  propsSection.appendChild(sectionTitle("Star shape"));

  // Points
  const pointsRow = h("div", "toolbar-count-row mb-2");
  const pointsInfo = h("span", "text-xs text-secondary mb-0.5");
  pointsInfo.textContent = `Points (${sfConfig.minStarPoints}\u2013${sfConfig.maxStarPoints})`;
  const pointsLabel = h("span", "toolbar-count-label text-base-content", String(sfConfig.defaultStarPoints));
  const pointsBtnMinus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "\u2212");
  pointsBtnMinus.type = "button";
  pointsBtnMinus.setAttribute("aria-label", "Decrease star points");
  const pointsBtnPlus = h("button", "join-item btn btn-outline btn-xs toolbar-count-btn", "+");
  pointsBtnPlus.type = "button";
  pointsBtnPlus.setAttribute("aria-label", "Increase star points");
  pointsBtnMinus.addEventListener("click", () => {
    const sel = getSelected();
    if (sel) {
      const next = Math.max(sfConfig.minStarPoints, (sel.starPoints ?? sfConfig.defaultStarPoints) - 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starPoints: next } });
    }
  });
  pointsBtnPlus.addEventListener("click", () => {
    const sel = getSelected();
    if (sel) {
      const next = Math.min(sfConfig.maxStarPoints, (sel.starPoints ?? sfConfig.defaultStarPoints) + 1);
      emit(root, "toolbar:starfield-update", { id: sel.id, props: { starPoints: next } });
    }
  });
  pointsRow.append(pointsBtnMinus, pointsLabel, pointsBtnPlus);
  propsSection.appendChild(pointsInfo);
  propsSection.appendChild(pointsRow);

  // Point length slider
  const plLabel = h("div", "text-xs text-secondary mb-0.5");
  propsSection.appendChild(plLabel);
  const plSlider = document.createElement("input");
  plSlider.type = "range";
  plSlider.className = "range range-xs range-primary w-full mb-2";
  plSlider.min = "10";
  plSlider.max = "90";
  plSlider.value = String(Math.round(sfConfig.defaultStarPointLength * 100));
  plSlider.setAttribute("aria-label", "Star point length");
  plLabel.textContent = `Point length (lower = longer points): ${plSlider.value}%`;
  plSlider.addEventListener("input", () => {
    plLabel.textContent = `Point length (lower = longer points): ${plSlider.value}%`;
    const sel = getSelected();
    if (sel) emit(root, "toolbar:starfield-update", { id: sel.id, props: { starPointLength: Number(plSlider.value) / 100 } });
  });
  propsSection.appendChild(plSlider);

  // ── Appearance ──
  propsSection.appendChild(sectionTitle("Appearance"));

  // Star size slider
  const sizeLabel = h("div", "text-xs text-secondary mb-0.5");
  const sizeSlider = document.createElement("input");
  sizeSlider.type = "range";
  sizeSlider.className = "range range-xs range-primary w-full mb-2";
  sizeSlider.min = "10";
  sizeSlider.max = "85";
  sizeSlider.value = String(sfConfig.defaultStarSize);
  sizeSlider.setAttribute("aria-label", "Star size");
  sizeLabel.textContent = `Star size: ${sizeSlider.value}%`;
  sizeSlider.addEventListener("input", () => {
    sizeLabel.textContent = `Star size: ${sizeSlider.value}%`;
    const sel = getSelected();
    if (sel) emit(root, "toolbar:starfield-update", { id: sel.id, props: { starSize: Number(sizeSlider.value) } });
  });
  propsSection.appendChild(sizeLabel);
  propsSection.appendChild(sizeSlider);

  // Star color
  const colorRow = h("div", "flex items-center gap-2 mb-2");
  const colorLabel = h("span", "text-xs text-secondary", "Star color");
  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = sfConfig.defaultFill;
  colorPicker.className = "toolbar-color-picker";
  colorPicker.setAttribute("aria-label", "Star fill color");
  colorPicker.addEventListener("input", () => {
    const sel = getSelected();
    if (sel) emit(root, "toolbar:starfield-update", { id: sel.id, props: { fill: colorPicker.value } });
  });
  colorRow.append(colorLabel, colorPicker);
  propsSection.appendChild(colorRow);

  panel.appendChild(propsSection);

  // ── Sync controls to selected starfield ──
  function syncControls(): void {
    const sel = getSelected();
    if (!sel) {
      propsSection.style.display = "none";
      return;
    }
    propsSection.style.display = "";
    distSelect.value = sel.starDistribution ?? sfConfig.defaultDistribution;
    starCountLabel.textContent = String(sel.starCount ?? sfConfig.defaultStarCount);
    colsLabel.textContent = String(sel.starCols ?? 6);
    rotateCheckbox.checked = sel.starRotateWithPosition ?? false;
    pointsLabel.textContent = String(sel.starPoints ?? sfConfig.defaultStarPoints);
    const pl = Math.round((sel.starPointLength ?? sfConfig.defaultStarPointLength) * 100);
    plSlider.value = String(pl);
    plLabel.textContent = `Point length (lower = longer points): ${pl}%`;
    const ss = sel.starSize ?? sfConfig.defaultStarSize;
    sizeSlider.value = String(ss);
    sizeLabel.textContent = `Star size: ${ss}%`;
    colorPicker.value = sel.fill;

    // Show/hide columns control based on distribution
    const showCols = sel.starDistribution === "grid" || sel.starDistribution === "staggered-grid";
    colsSection.style.display = showCols ? "" : "none";
  }

  function updateCountInfoSf(): void {
    const count = currentStarfields.length;
    countInfo.textContent = `${count} / ${maxStarfields} starfields`;
    addBtn.disabled = count >= maxStarfields;
    addBtn.style.opacity = count >= maxStarfields ? "0.4" : "";
  }

  function renderLayerListSf(): void {
    list.innerHTML = "";
    if (currentStarfields.length === 0) {
      const empty = h("p", "toolbar-empty-text text-xs text-secondary", "Add a starfield to begin");
      list.appendChild(empty);
      updateCountInfoSf();
      syncControls();
      return;
    }
    for (let i = currentStarfields.length - 1; i >= 0; i--) {
      const ov = currentStarfields[i];
      const row = createLayerRow(root, ov, i, "overlays", currentStarfields.length);
      row.addEventListener("click", () => {
        selectedId = ov.id;
        syncControls();
      });
      if (ov.id === selectedId) row.classList.add("toolbar-layer-row-selected");
      list.appendChild(row);
    }
    updateCountInfoSf();
    syncControls();
  }

  root.addEventListener("toolbar:sync-layers", ((e: Event) => {
    const { overlays } = (e as CustomEvent<{ overlays: Overlay[] }>).detail;
    currentStarfields = overlays.filter((o) => overlayLayerGroup(o) === "starfields");
    // If selected starfield was removed, clear selection
    if (selectedId && !currentStarfields.find((o) => o.id === selectedId)) {
      selectedId = null;
    }
    renderLayerListSf();
  }) as EventListener);

  updateCountInfoSf();
  renderLayerListSf();
  return panel;
}

function createTemplatesPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Templates", PanelIcons.templates));
  const groupConfigs = config.templateGroups.map((groupName) => {
    const entries = TEMPLATE_CATALOG.filter((entry) => entry.group === groupName);
    if (entries.length === 0) {
      throw new Error(`template catalog: template group "${groupName}" has no config`);
    }
    return { group: groupName, entries };
  });

  let availableSymbols = getLoadedBuiltinSymbols();
  const symbolItems: Array<{ btn: HTMLButtonElement; cfg: TemplateCfg }> = [];

  for (const [index, group] of groupConfigs.entries()) {
    const section = h("section", "toolbar-template-section");
    const toggle = h("button", "toolbar-template-section-toggle") as HTMLButtonElement;
    const content = h("div", "toolbar-template-section-content");
    const grid = h("div", "toolbar-template-grid");
    const title = h("span", "toolbar-section-title text-secondary", group.group);
    const chevron = h("span", "toolbar-template-section-chevron");
    const contentId = `toolbar-template-group-${group.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const startsOpen = group.group === DEFAULT_OPEN_TEMPLATE_GROUP || (index === 0 && !groupConfigs.some((entry) => entry.group === DEFAULT_OPEN_TEMPLATE_GROUP));
    let rendered = false;

    title.style.margin = "0";
    chevron.innerHTML = svg('<polyline points="6 9 12 15 18 9" fill="none"/>', 16);

    toggle.type = "button";
    toggle.setAttribute("aria-expanded", String(startsOpen));
    toggle.setAttribute("aria-controls", contentId);
    toggle.append(title, chevron);

    content.id = contentId;
    content.hidden = !startsOpen;
    content.appendChild(grid);

    async function renderEntries(): Promise<void> {
      if (rendered) return;
      rendered = true;
      const templateEntries = group.entries.map((entry) => {
        const create = ALL_TEMPLATE_FACTORIES[entry.id];
        if (!create) {
          throw new Error(`template catalog: missing factory for template "${entry.id}"`);
        }
        const cfg = create();
        return { entry, cfg };
      });

      const symbolIds = collectSymbolIds(templateEntries.flatMap(({ cfg }) => cfg.overlays));

      if (symbolIds.length > 0) {
        await ensureBuiltinSymbolsByIds(symbolIds);
        availableSymbols = getAllSymbols([], getLoadedBuiltinSymbols());
      }

      for (const { entry, cfg } of templateEntries) {
        const item = h("button", "toolbar-template-item");
        item.type = "button";
        item.setAttribute("aria-label", `Apply ${entry.name} template`);
        const thumb = entry.previewImagePath
          ? templateStaticPreview(entry, cfg)
          : templateThumbnail(cfg, 28, availableSymbols);
        const name = h("span", "toolbar-template-name text-xs text-secondary", entry.name);
        item.append(thumb, name);
        item.addEventListener("click", () => {
          emit(root, "toolbar:template", { id: entry.id, config: cfg });
        });
        grid.appendChild(item);
        if (!entry.previewImagePath && cfg.overlays.some((ov) => ov.type === "symbol")) {
          symbolItems.push({ btn: item, cfg });
        }
      }
    }

    function setOpen(open: boolean): void {
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        void renderEntries();
      }
      content.hidden = !open;
    }

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    if (startsOpen) {
      void renderEntries();
    }

    section.append(toggle, content);
    panel.appendChild(section);
  }

  root.addEventListener("symbols:loaded", ((e: Event) => {
    const { symbols } = (e as CustomEvent<{ symbols: SymbolDef[] }>).detail;
    availableSymbols = getAllSymbols(symbols, getLoadedBuiltinSymbols());
    for (const { btn, cfg } of symbolItems) {
      const newThumb = templateThumbnail(cfg, 28, availableSymbols);
      btn.replaceChild(newThumb, btn.firstChild!);
    }
  }) as EventListener);

  return panel;
}

function createSymbolsPanel(root: HTMLElement): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Symbols", PanelIcons.symbols));

  // -- Active symbol layers section --
  const maxSymbols = LAYER_GROUP_CONSTRAINTS.symbols.maxLayers;
  const layerSection = h("div", "toolbar-symbol-layers");
  const layerTitle = sectionTitle("Active Symbols");
  layerSection.appendChild(layerTitle);

  const layerCountInfo = h("div", "toolbar-layer-count text-xs text-secondary mb-1.5");
  layerSection.appendChild(layerCountInfo);

  const layerList = h("div", "toolbar-overlay-list");
  layerSection.appendChild(layerList);
  panel.appendChild(layerSection);

  let currentSymbols: Overlay[] = [];
  let addDisabled = false;

  function updateSymbolCount(): void {
    const count = currentSymbols.length;
    layerCountInfo.textContent = `${count} / ${maxSymbols} layers`;
    addDisabled = count >= maxSymbols;
  }

  function renderSymbolLayerList(): void {
    layerList.innerHTML = "";
    if (currentSymbols.length === 0) {
      const empty = h("p", "toolbar-empty-text text-xs text-secondary", "No symbols placed");
      layerList.appendChild(empty);
      updateSymbolCount();
      return;
    }
    for (let i = currentSymbols.length - 1; i >= 0; i--) {
      const ov = currentSymbols[i];
      layerList.appendChild(createLayerRow(root, ov, i, "symbols", currentSymbols.length));
    }
    updateSymbolCount();
  }

  root.addEventListener("toolbar:sync-layers", ((e: Event) => {
    const { overlays } = (e as CustomEvent<{ overlays: Overlay[] }>).detail;
    currentSymbols = overlays.filter((o) => overlayLayerGroup(o) === "symbols");
    renderSymbolLayerList();
  }) as EventListener);

  updateSymbolCount();
  renderSymbolLayerList();

  // -- Symbol browser section --
  panel.appendChild(sectionTitle("Add Symbol"));

  // Search input
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search symbols...";
  search.className = "input input-sm input-bordered w-full mb-2";
  search.setAttribute("aria-label", "Search symbols");
  panel.appendChild(search);

  // Mutable symbol list (built-ins + loaded emblems)
  let remoteSymbols: SymbolDef[] = [];
  let allSymbols: SymbolDef[] = getAllSymbols(remoteSymbols, getLoadedBuiltinSymbols());

  // Category filter tabs (no "All" -- each category shows only its own symbols)
  const catRow = h("div", "toolbar-cat-row");
  let activeCat = BUILTIN_SYMBOL_CATEGORIES[0] ?? allSymbols[0]?.category ?? "";

  async function ensureCategoryLoaded(category: string): Promise<void> {
    if (BUILTIN_SYMBOL_CATEGORIES.includes(category) && !isBuiltinSymbolCategoryLoaded(category)) {
      await loadBuiltinSymbolsForCategory(category);
    }
    allSymbols = getAllSymbols(remoteSymbols, getLoadedBuiltinSymbols());
  }

  function rebuildCategoryTabs(): void {
    catRow.innerHTML = "";
    const categories = [...new Set([...BUILTIN_SYMBOL_CATEGORIES, ...allSymbols.map((s) => s.category)])];
    // Reset active to first category if current one no longer exists
    if (!categories.includes(activeCat)) activeCat = categories[0] ?? "";
    for (const cat of categories) {
      const btn = h("button", "btn btn-xs toolbar-cat-btn", cat);
      btn.type = "button";
      if (cat === activeCat) btn.classList.add("active");
      btn.addEventListener("click", () => {
        activeCat = cat;
        catRow
          .querySelectorAll(".toolbar-cat-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        void ensureCategoryLoaded(activeCat).then(() => {
          rebuildCategoryTabs();
          renderGrid();
        });
      });
      catRow.appendChild(btn);
    }
  }

  rebuildCategoryTabs();
  panel.appendChild(catRow);

  // Symbol grid
  const grid = h("div", "toolbar-symbol-grid");
  panel.appendChild(grid);

  // Lazy-render symbols in batches for performance with large catalogs.
  const BATCH_SIZE = 30;
  let lazyFiltered: SymbolDef[] = [];
  let lazyRendered = 0;
  let lazySentinel: HTMLElement | null = null;
  let lazyObserver: IntersectionObserver | null = null;

  function createSymbolButton(sym: SymbolDef): HTMLButtonElement {
    const item = h("button", "toolbar-symbol-item") as HTMLButtonElement;
    item.type = "button";
    item.title = sym.name;
    item.setAttribute("aria-label", `Add ${sym.name}`);
    if (addDisabled) {
      item.disabled = true;
      item.style.opacity = "0.4";
    }
    item.appendChild(symbolPreview(sym));
    item.addEventListener("click", () => {
      if (!addDisabled) {
        emit(root, "toolbar:symbol", { symbolId: sym.id });
      }
    });
    return item;
  }

  function renderBatch(): void {
    const batchEnd = lazyObserver
      ? Math.min(lazyRendered + BATCH_SIZE, lazyFiltered.length)
      : lazyFiltered.length;
    for (let i = lazyRendered; i < batchEnd; i++) {
      grid.appendChild(createSymbolButton(lazyFiltered[i]));
    }
    lazyRendered = batchEnd;

    // Manage sentinel for triggering the next batch
    lazySentinel?.remove();
    lazySentinel = null;
    if (lazyObserver && lazyRendered < lazyFiltered.length) {
      lazySentinel = h("div", "toolbar-symbol-sentinel");
      lazySentinel.style.height = "1px";
      grid.appendChild(lazySentinel);
      lazyObserver.observe(lazySentinel);
    }
  }

  function renderGrid(): void {
    grid.innerHTML = "";
    lazyRendered = 0;
    lazySentinel = null;

    const query = search.value.toLowerCase();
    lazyFiltered = allSymbols.filter((s) => {
      if (s.category !== activeCat) return false;
      if (query && !s.name.toLowerCase().includes(query)) return false;
      return true;
    });

    if (lazyFiltered.length === 0) {
      const noResults = h("p", "toolbar-empty-text text-xs text-secondary", "No symbols found");
      grid.appendChild(noResults);
      return;
    }

    renderBatch();
  }

  // Observe sentinel visibility to load more symbols on scroll
  if (typeof IntersectionObserver !== "undefined") {
    lazyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && lazyRendered < lazyFiltered.length) {
            renderBatch();
          }
        }
      },
      { root: null, rootMargin: "200px" },
    );
  }

  search.addEventListener("input", renderGrid);
  void ensureCategoryLoaded(activeCat).then(() => {
    rebuildCategoryTabs();
    renderGrid();
  });

  // Listen for dynamically loaded symbols (e.g. from symbols.json)
  root.addEventListener("symbols:loaded", ((e: Event) => {
    const { symbols } = (e as CustomEvent<{ symbols: SymbolDef[] }>).detail;
    remoteSymbols = symbols;
    allSymbols = getAllSymbols(remoteSymbols, getLoadedBuiltinSymbols());
    rebuildCategoryTabs();
    renderGrid();
  }) as EventListener);

  return panel;
}

/* ── Saved Panel ── */

function createSavedPanel(): HTMLElement {
  const panel = h("div", "toolbar-panel-content");
  panel.appendChild(panelHeader("Saved", PanelIcons.saved));

  const empty = h("div", "flex flex-col items-center justify-center gap-2 py-8");
  const icon = h("span", "toolbar-panel-icon");
  icon.innerHTML = TabIcons.saved;
  icon.style.opacity = "0.4";
  empty.appendChild(icon);

  const msg = h("p", "toolbar-empty-text text-xs text-secondary", "No saved designs yet");
  empty.appendChild(msg);

  panel.appendChild(empty);
  return panel;
}

/* ──────────────────────────────────────────────
   Main Flag Editor (leftbar)
   ────────────────────────────────────────────── */

export function createLeftbar(): HTMLElement {
  validateLeftbarConfig(config);
  validateTemplateCatalog(config.templateGroups, TEMPLATE_GROUPED_CONFIGS, ALL_TEMPLATE_FACTORIES);

  const testHooksSearch = new URLSearchParams(globalThis.location.search);
  /* v8 ignore start */
  if (testHooksSearch.has("e2e-hooks")) {
    const testHookTarget = globalThis as typeof globalThis & {
      __FLAG_MAKER_TEST_HOOKS__?: Record<string, unknown>;
    };
    testHookTarget.__FLAG_MAKER_TEST_HOOKS__ = {
      ...testHookTarget.__FLAG_MAKER_TEST_HOOKS__,
      getLeftbarConfig: () => JSON.parse(JSON.stringify(config)),
      validateLeftbarConfig,
      renderPanelHeaderMarkup: (text: string, tabId: string) =>
        panelHeader(text, PanelIcons[tabId as TabId]).outerHTML,
      renderTemplateThumbnailMarkup: (cfg: TemplateCfg, symbols?: SymbolDef[]) =>
        templateThumbnail(cfg, 28, symbols).outerHTML,
      runLeftbarCoverageProbe: async () => {
        panelHeader("Probe");
        templateThumbnail({
          ratio: [1, 2],
          orientation: "horizontal",
          sections: 1,
          colors: ["#000000"],
          overlays: [
            { type: "rectangle", x: 50, y: 50, w: 20, h: 20, rotation: 0, fill: "#ffffff" } as Overlay,
            { type: "symbol", symbolId: "missing", x: 50, y: 50, w: 20, h: 20, rotation: 0, fill: "#ffffff" } as Overlay,
          ],
        });
        templateThumbnail({
          ratio: [2, 3],
          orientation: "vertical",
          sections: 2,
          weights: [2, 1],
          colors: ["#112233", "#ddeeff"],
          overlays: [],
        });

        const probeRoot = document.createElement("div");

        const ratioPanel = createRatioPanel(probeRoot);
        probeRoot.appendChild(ratioPanel);
        (ratioPanel.querySelector(".toolbar-ratio-mode-btn") as HTMLButtonElement | null)?.click();
        (ratioPanel.querySelector(".toolbar-ratio-mode-btn") as HTMLButtonElement | null)?.click();
        const sortSelect = ratioPanel.querySelector('select[aria-label="Sort aspect ratios"]') as HTMLSelectElement | null;
        if (sortSelect) {
          sortSelect.value = "value";
          sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
          sortSelect.value = "commonality";
          sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const stripesPanel = createStripesPanel(probeRoot);
        probeRoot.appendChild(stripesPanel);
        (stripesPanel.querySelector('[aria-label="Increase stripe count"]') as HTMLButtonElement | null)?.click();
        (stripesPanel.querySelector('[aria-label="Decrease stripe count"]') as HTMLButtonElement | null)?.click();
        (stripesPanel.querySelectorAll(".toolbar-orient-btn")[1] as HTMLButtonElement | undefined)?.click();
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-colors", {
          detail: { colors: ["#111111", "#222222", "#333333"] },
          bubbles: true,
        }));
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-stripes", {
          detail: {
            colors: ["#444444", "#555555"],
            orientation: "vertical",
          },
          bubbles: true,
        }));

        const overlaysPanel = createOverlaysPanel(probeRoot);
        probeRoot.appendChild(overlaysPanel);
        overlaysPanel.querySelectorAll(".toolbar-add-btn").forEach((button) => {
          (button as HTMLButtonElement).click();
        });
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-layers", {
          detail: {
            overlays: Array.from({ length: LAYER_GROUP_CONSTRAINTS.overlays.maxLayers }, (_, index) => ({
              id: `overlay-${index}`,
              type: "rectangle",
              x: 50,
              y: 50,
              w: 20,
              h: 20,
              rotation: 0,
              fill: "#000000",
            })),
          },
          bubbles: true,
        }));
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-layers", {
          detail: { overlays: [] },
          bubbles: true,
        }));

        const starfieldPanel = createStarfieldPanel(probeRoot);
        probeRoot.appendChild(starfieldPanel);
        (starfieldPanel.querySelector('[aria-label="Add starfield overlay"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Increase star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Increase column count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease column count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Rotate stars with position"]') as HTMLInputElement | null)?.dispatchEvent(new Event("change", { bubbles: true }));
        (starfieldPanel.querySelector('[aria-label="Increase star points"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease star points"]') as HTMLButtonElement | null)?.click();
        const probeStarfield = {
          id: "probe-starfield",
          type: "starfield",
          x: 50,
          y: 50,
          w: 20,
          h: 20,
          rotation: 0,
          fill: "#ffcc00",
          starDistribution: "staggered-grid",
          starCount: 12,
          starCols: 6,
          starRotateWithPosition: false,
          starPoints: 5,
          starPointLength: 0.38,
          starSize: 50,
        } as Overlay;
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-layers", {
          detail: { overlays: [probeStarfield] },
          bubbles: true,
        }));
        (starfieldPanel.querySelector(".toolbar-layer-row") as HTMLElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Increase star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Increase column count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease column count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Rotate stars with position"]') as HTMLInputElement | null)?.dispatchEvent(new Event("change", { bubbles: true }));
        (starfieldPanel.querySelector('[aria-label="Increase star points"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease star points"]') as HTMLButtonElement | null)?.click();
        const pointLength = starfieldPanel.querySelector('[aria-label="Star point length"]') as HTMLInputElement | null;
        if (pointLength) {
          pointLength.value = "42";
          pointLength.dispatchEvent(new Event("input", { bubbles: true }));
        }
        const starSize = starfieldPanel.querySelector('[aria-label="Star size"]') as HTMLInputElement | null;
        if (starSize) {
          starSize.value = "61";
          starSize.dispatchEvent(new Event("input", { bubbles: true }));
        }
        const starColor = starfieldPanel.querySelector('[aria-label="Star fill color"]') as HTMLInputElement | null;
        if (starColor) {
          starColor.value = "#00ffcc";
          starColor.dispatchEvent(new Event("input", { bubbles: true }));
        }
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-layers", {
          detail: { overlays: [] },
          bubbles: true,
        }));
        (starfieldPanel.querySelector('[aria-label="Increase star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease star count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Increase column count"]') as HTMLButtonElement | null)?.click();
        (starfieldPanel.querySelector('[aria-label="Decrease column count"]') as HTMLButtonElement | null)?.click();

        const templatesPanel = createTemplatesPanel(probeRoot);
        probeRoot.appendChild(templatesPanel);
        templatesPanel.querySelectorAll(".toolbar-template-section-toggle").forEach((toggle) => {
          (toggle as HTMLButtonElement).click();
          (toggle as HTMLButtonElement).click();
        });
        await Promise.resolve();
        probeRoot.dispatchEvent(new CustomEvent("symbols:loaded", {
          detail: {
            symbols: [{
              id: "probe-symbol",
              name: "Probe Symbol",
              category: "Test",
              viewBox: "0 0 100 100",
              svg: "<circle cx='50' cy='50' r='40' />",
            }],
          },
          bubbles: false,
        }));

        const symbolsPanel = createSymbolsPanel(probeRoot);
        probeRoot.appendChild(symbolsPanel);
        await Promise.resolve();
        symbolsPanel.querySelectorAll(".toolbar-cat-btn").forEach((button) => {
          (button as HTMLButtonElement).click();
        });
        probeRoot.dispatchEvent(new CustomEvent("symbols:loaded", {
          detail: {
            symbols: [{
              id: "probe-symbol-2",
              name: "Alternate Symbol",
              category: "Alternate",
              viewBox: "0 0 100 100",
              path: "M10 10 L90 10 L50 90 Z",
            }],
          },
          bubbles: false,
        }));
        probeRoot.dispatchEvent(new CustomEvent("toolbar:sync-layers", {
          detail: {
            overlays: Array.from({ length: LAYER_GROUP_CONSTRAINTS.symbols.maxLayers }, (_, index) => ({
              id: `symbol-${index}`,
              type: "symbol",
              symbolId: "probe-symbol",
              x: 50,
              y: 50,
              w: 20,
              h: 20,
              rotation: 0,
              fill: "#000000",
            })),
          },
          bubbles: true,
        }));
        const search = symbolsPanel.querySelector('input[type="search"]') as HTMLInputElement | null;
        if (search) {
          search.value = "no-match";
          search.dispatchEvent(new Event("input", { bubbles: true }));
          search.value = "";
          search.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await Promise.resolve();
        return true;
      },
    };
  }
  /* v8 ignore stop */

  const aside = document.createElement("aside");
  aside.className = "toolbar relative flex bg-base-200 border-r border-base-300";

  // ── Tab strip ──
  const strip = h("nav", "toolbar-strip flex flex-col items-center gap-0.5 py-2 shrink-0 w-12 border-r border-base-300");
  strip.setAttribute("aria-label", "Toolbar tabs");

  // ── Panel container ──
  const panelContainer = h("div", "toolbar-panel bg-base-200");

  // ── Build panels ──
  const panels: Record<string, HTMLElement> = {
    ratio: createRatioPanel(aside),
    stripes: createStripesPanel(aside),
    overlays: createOverlaysPanel(aside),
    starfield: createStarfieldPanel(aside),
    templates: createTemplatesPanel(aside),
    symbols: createSymbolsPanel(aside),
    saved: createSavedPanel(),
  };

  // ── State ──
  let activeTab: TabId = DEFAULT_ACTIVE_TAB;
  let panelOpen = false;
  const desktopMQ = window.matchMedia("(min-width: 1280px)");

  // ── Tab buttons ──
  const tabButtons: Record<string, HTMLButtonElement> = {};
  for (const item of TAB_STRIP) {
    if ("separator" in item) {
      const sep = h("div", "divider divider-horizontal w-6 h-px mx-auto my-1");
      sep.setAttribute("aria-hidden", "true");
      strip.appendChild(sep);
      continue;
    }
    const tab = item;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = tab.label;
    btn.setAttribute("aria-label", tab.label);
    btn.className =
      "btn btn-ghost btn-sm btn-square toolbar-tab-btn";
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
  function switchTab(tabId: TabId): void {
    activeTab = tabId;
    for (const [key, btn] of Object.entries(tabButtons)) {
      btn.classList.toggle("active", key === tabId);
    }
    panelContainer.innerHTML = "";
    const p = panels[tabId];
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
