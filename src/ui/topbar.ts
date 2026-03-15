/* ──────────────────────────────────────────────
   Flag Maker – Application Settings (topbar)
   Windows 11–inspired compact title bar with
   global app actions.
   ────────────────────────────────────────────── */

import { svg } from "./icons";
import { getCurrentSvg, getCurrentRatio } from "../flagRenderer";
import { VIEW_W } from "../geometry";
import { download, svgToRaster, downloadDataUrl } from "../utils";
import exportSizesConfig from "@/config/export-sizes.json";

const cfg = exportSizesConfig;

const MAJOR_VERSION = 0;
/** Digits reserved for the commit counter: supports up to 999 commits per major; version format: `<major>.NNN`. */
const VERSION_PADDING_WIDTH = 3;
/**
 * App version string displayed in the topbar.
 * Format: `<major>.<commits>` where commits is the fork-local git commit
 * count, zero-padded to `VERSION_PADDING_WIDTH` digits (e.g. `0.007`).
 * `__COMMIT_COUNT__` is a compile-time constant injected by Vite `define`
 * at build time -- see `vite.config.ts`. Falls back to `0` in environments
 * where Vite substitution does not run (e.g. plain `tsc`).
 */
export const APP_VERSION = `${MAJOR_VERSION}.${String(__COMMIT_COUNT__ ?? 0).padStart(VERSION_PADDING_WIDTH, "0")}`;

const Icons = {
  flag: svg(
    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>' +
      '<line x1="4" y1="22" x2="4" y2="15"/>',
    20,
  ),
  sun: svg(
    '<circle cx="12" cy="12" r="5"/>' +
      '<line x1="12" y1="1" x2="12" y2="3"/>' +
      '<line x1="12" y1="21" x2="12" y2="23"/>' +
      '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
      '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
      '<line x1="1" y1="12" x2="3" y2="12"/>' +
      '<line x1="21" y1="12" x2="23" y2="12"/>' +
      '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
      '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  ),
  moon: svg(
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  ),
  reset: svg(
    '<path d="M1 4v6h6"/>' +
      '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  ),
  save: svg(
    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
      '<polyline points="17 21 17 13 7 13 7 21"/>' +
      '<polyline points="7 3 7 8 15 8"/>',
  ),
  download: svg(
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
      '<polyline points="7 10 12 15 17 10"/>' +
      '<line x1="12" y1="15" x2="12" y2="3"/>',
  ),
  chevronDown: svg('<polyline points="6 9 12 15 18 9"/>', 14),
};

/* ── Button Factory ── */

function iconButton(
  icon: string,
  label: string,
  onClick?: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.className = "btn btn-ghost btn-sm btn-square";
  btn.innerHTML = icon;
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

/* ── Theme Toggle ── */

function createThemeToggle(): HTMLButtonElement {
  const btn = iconButton(Icons.sun, "Toggle dark / light mode");

  function syncIcon(): void {
    const isDark = document.documentElement.classList.contains("dark");
    btn.innerHTML = isDark ? Icons.sun : Icons.moon;
    btn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    btn.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
  }

  btn.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");
    html.classList.toggle("dark", !isDark);
    html.classList.toggle("light", isDark);
    html.setAttribute("data-theme", isDark ? "flagmaker-light" : "flagmaker-dark");
    syncIcon();
  });

  syncIcon();
  return btn;
}

/* ── Export Error Notification ── */

// Populated lazily on first call -- either by createTopbar() (normal path)
// or on first showExportError() call (defensive fallback).
let _exportLiveRegion: HTMLDivElement | null = null;

function ensureExportLiveRegion(): HTMLDivElement {
  if (!_exportLiveRegion) {
    _exportLiveRegion = document.createElement("div");
    _exportLiveRegion.id = "export-live-status";
    _exportLiveRegion.setAttribute("aria-live", "assertive");
    _exportLiveRegion.setAttribute("aria-atomic", "true");
    _exportLiveRegion.style.cssText =
      "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;";
  }
  return _exportLiveRegion;
}

let _exportToast: HTMLElement | null = null;
let _exportToastTimer = 0;

function showExportError(format: string): void {
  const msg = `${format} export failed. Please try again.`;
  const liveRegion = ensureExportLiveRegion();

  // Announce to screen readers via the persistent live region.
  // Clear first so re-announcement fires if the same message appears twice.
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = msg;
  });

  // Show visible toast, replacing any existing one.
  if (_exportToast) {
    clearTimeout(_exportToastTimer);
    _exportToast.remove();
  }
  _exportToast = document.createElement("div");
  _exportToast.textContent = msg;
  _exportToast.setAttribute("aria-hidden", "true");
  _exportToast.className = "alert alert-error alert-horizontal fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] pointer-events-none w-auto text-sm";
  document.body.appendChild(_exportToast);
  _exportToastTimer = window.setTimeout(() => {
    _exportToast?.remove();
    _exportToast = null;
    ensureExportLiveRegion().textContent = "";
  }, 4000);
}

/* ── Export Size Selector ── */

const defaultSizeEntry = cfg.sizes.find((s) => s.id === cfg.defaultSize);
if (!defaultSizeEntry) {
  throw new Error(
    `Export size configuration error: defaultSize "${cfg.defaultSize}" does not match any entry in sizes[].id. Check src/config/export-sizes.json.`,
  );
}
const DEFAULT_PX_PER_RATIO: number = defaultSizeEntry.pxPerRatio;

let selectedPxPerRatio: number = DEFAULT_PX_PER_RATIO;

/** Reset export size to the config default. Intended for use in tests only. */
export function resetExportSizeState(): void {
  selectedPxPerRatio = DEFAULT_PX_PER_RATIO;
}

export function getSelectedPxPerRatio(): number {
  return selectedPxPerRatio;
}

/**
 * Computes the SVG-to-raster scale factor for a given export configuration.
 * Formula: (pxPerRatio * ratioWidth) / VIEW_W
 * Converts the user's desired pixels-per-ratio-unit into a scale factor
 * relative to the fixed viewBox width (VIEW_W).
 *
 * The exported image width equals `pxPerRatio * ratioWidth` pixels.
 * For example, `pxPerRatio=500` with a 2:3 flag (ratioWidth=3) yields
 * scale=1.25 and produces a 1500px-wide exported image.
 */
export function computeExportScale(pxPerRatio: number, ratioWidth: number): number {
  return (pxPerRatio * ratioWidth) / VIEW_W;
}

function createExportSizeSelect(): HTMLSelectElement {
  const select = document.createElement("select");
  select.title = "Export size";
  select.setAttribute("aria-label", "Export size");
  select.className = "select select-sm select-ghost";

  for (const size of cfg.sizes) {
    const opt = document.createElement("option");
    opt.value = String(size.pxPerRatio);
    opt.textContent = size.label;
    if (size.id === cfg.defaultSize) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", () => {
    selectedPxPerRatio = Number(select.value);
  });

  return select;
}

/* ── Export Dropdown ── */

function createExportButton(): HTMLElement {
  const wrapper = document.createElement("details");
  wrapper.className = "dropdown dropdown-end";

  // Trigger button
  const btn = document.createElement("summary");
  btn.title = "Export";
  btn.setAttribute("aria-label", "Export flag");
  btn.setAttribute("aria-describedby", "export-live-status");
  btn.className = "btn btn-ghost btn-sm";
  btn.innerHTML =
    `${Icons.download}<span class="hidden xl:inline">Export</span>${Icons.chevronDown}`;

  // Dropdown menu
  const menu = document.createElement("ul");
  menu.className = "dropdown-content menu bg-base-300 rounded-box z-[100] w-40 p-2 shadow-lg";
  menu.setAttribute("role", "menu");

  function menuItem(label: string, onClick: () => void): HTMLLIElement {
    const li = document.createElement("li");
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    item.setAttribute("role", "menuitem");
    item.addEventListener("click", () => {
      wrapper.removeAttribute("open");
      onClick();
    });
    li.appendChild(item);
    return li;
  }

  menu.append(
    menuItem("Export SVG", () => {
      const svgEl = getCurrentSvg();
      if (!svgEl) return;
      const xml = new XMLSerializer().serializeToString(svgEl);
      download("flag.svg", xml, "image/svg+xml;charset=utf-8");
    }),
    menuItem("Export PNG", () => {
      const svgEl = getCurrentSvg();
      if (!svgEl) return;
      const [, ratioWidth] = getCurrentRatio();
      svgToRaster(svgEl, "image/png", computeExportScale(selectedPxPerRatio, ratioWidth))
        .then((dataUrl) => downloadDataUrl(dataUrl, "flag.png"))
        .catch((err: unknown) => {
          console.error("PNG export failed:", err);
          showExportError("PNG");
        });
    }),
    menuItem("Export JPG", () => {
      const svgEl = getCurrentSvg();
      if (!svgEl) return;
      const [, ratioWidth] = getCurrentRatio();
      svgToRaster(svgEl, "image/jpeg", computeExportScale(selectedPxPerRatio, ratioWidth), 0.92)
        .then((dataUrl) => downloadDataUrl(dataUrl, "flag.jpg"))
        .catch((err: unknown) => {
          console.error("JPG export failed:", err);
          showExportError("JPG");
        });
    }),
  );

  wrapper.append(btn, menu);
  return wrapper;
}

/* ── Application Settings topbar (public API) ── */

export function createTopbar(): HTMLElement {
  const header = document.createElement("header");
  header.className = "navbar bg-base-300 min-h-11 h-11 px-3 shrink-0";
  header.style.backdropFilter = "blur(8px)";
  header.style.gridColumn = "1 / -1";
  header.style.zIndex = "60";

  // ── Left: logo + title ──
  const left = document.createElement("div");
  left.className = "navbar-start gap-2";

  const logo = document.createElement("span");
  logo.className = "flex items-center text-primary";
  logo.innerHTML = Icons.flag;

  const title = document.createElement("span");
  title.className = "text-sm font-semibold hidden sm:inline text-base-content";
  title.textContent = "Flag Maker";

  const version = document.createElement("span");
  version.className = "text-[10px] hidden sm:inline text-secondary opacity-60";
  version.textContent = `v${APP_VERSION}`;

  left.append(logo, title, version);

  // ── Right: action buttons ──
  const right = document.createElement("div");
  right.className = "navbar-end gap-1";

  const themeBtn = createThemeToggle();

  // Subtle divider between theme toggle and action buttons
  const divider = document.createElement("div");
  divider.className = "divider divider-horizontal mx-0 w-px h-4";

  const resetBtn = iconButton(Icons.reset, "Reset flag", () => {
    resetBtn.dispatchEvent(new CustomEvent("topbar:reset", { bubbles: true }));
  });

  const saveBtn = iconButton(Icons.save, "Save project", () => {
    /* Save functionality not yet implemented. */
  });

  const exportSizeSelect = createExportSizeSelect();
  const exportBtn = createExportButton();

  right.append(themeBtn, divider, resetBtn, saveBtn, exportSizeSelect, exportBtn);

  // Create the screen-reader live region for export error announcements.
  // It must exist in the DOM before any error content is injected so
  // assistive technologies register the aria-live contract.
  const liveRegion = ensureExportLiveRegion();
  header.appendChild(liveRegion);

  header.append(left, right);
  return header;
}
