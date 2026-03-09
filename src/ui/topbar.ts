/* ──────────────────────────────────────────────
   Flag Maker – Application Settings (topbar)
   Windows 11–inspired compact title bar with
   global app actions.
   ────────────────────────────────────────────── */

import { svg } from "./icons";
import { getCurrentSvg } from "../flagRenderer";
import { download, svgToRaster, downloadDataUrl } from "../utils";

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
  btn.className =
    "topbar-btn flex items-center justify-center h-8 w-8 rounded-md " +
    "transition-colors cursor-pointer";
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
  _exportToast.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);" +
    "background:#c0392b;color:#fff;padding:8px 16px;border-radius:6px;" +
    "font-size:13px;z-index:110;pointer-events:none;white-space:nowrap;";
  document.body.appendChild(_exportToast);
  _exportToastTimer = window.setTimeout(() => {
    _exportToast?.remove();
    _exportToast = null;
    ensureExportLiveRegion().textContent = "";
  }, 4000);
}

/* ── Export Dropdown ── */

function createExportButton(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "relative";

  // Trigger button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = "Export";
  btn.setAttribute("aria-label", "Export flag");
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-describedby", "export-live-status");
  btn.className =
    "topbar-btn flex items-center gap-1 h-8 px-2.5 rounded-md " +
    "text-sm transition-colors cursor-pointer";
  btn.innerHTML =
    `${Icons.download}<span class="hidden xl:inline">Export</span>${Icons.chevronDown}`;

  // Dropdown menu
  const menu = document.createElement("div");
  menu.className =
    "hidden absolute right-0 top-full mt-1 py-1 rounded-md shadow-lg min-w-28";
  menu.style.backgroundColor = "var(--topbar-bg)";
  menu.style.border = "1px solid var(--divider)";
  menu.style.zIndex = "100";
  menu.setAttribute("role", "menu");

  function menuItem(label: string, onClick: () => void): HTMLButtonElement {
    const item = document.createElement("button");
    item.type = "button";
    item.className =
      "dropdown-item w-full text-left px-3 py-1.5 text-sm " +
      "transition-colors cursor-pointer";
    item.textContent = label;
    item.setAttribute("role", "menuitem");
    item.addEventListener("click", () => {
      close();
      onClick();
    });
    return item;
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
      svgToRaster(svgEl, "image/png", 2)
        .then((dataUrl) => downloadDataUrl(dataUrl, "flag.png"))
        .catch((err: unknown) => {
          console.error("PNG export failed:", err);
          showExportError("PNG");
        });
    }),
    menuItem("Export JPG", () => {
      const svgEl = getCurrentSvg();
      if (!svgEl) return;
      svgToRaster(svgEl, "image/jpeg", 2, 0.92)
        .then((dataUrl) => downloadDataUrl(dataUrl, "flag.jpg"))
        .catch((err: unknown) => {
          console.error("JPG export failed:", err);
          showExportError("JPG");
        });
    }),
  );

  function close(): void {
    menu.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !menu.classList.contains("hidden");
    if (isOpen) {
      close();
    } else {
      menu.classList.remove("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target instanceof Node && !wrapper.contains(e.target)) {
      close();
    }
  });

  wrapper.append(btn, menu);
  return wrapper;
}

/* ── Application Settings topbar (public API) ── */

export function createTopbar(): HTMLElement {
  const header = document.createElement("header");
  header.className = "flex items-center h-11 px-3 shrink-0";
  header.style.backgroundColor = "var(--topbar-bg)";
  header.style.borderBottom = "1px solid var(--divider)";
  header.style.backdropFilter = "blur(8px)";
  header.style.gridColumn = "1 / -1";
  header.style.zIndex = "60";

  // ── Left: logo + title ──
  const left = document.createElement("div");
  left.className = "flex items-center gap-2";

  const logo = document.createElement("span");
  logo.className = "flex items-center";
  logo.style.color = "var(--accent)";
  logo.innerHTML = Icons.flag;

  const title = document.createElement("span");
  title.className = "text-sm font-semibold hidden sm:inline";
  title.style.color = "var(--text-primary)";
  title.textContent = "Flag Maker";

  left.append(logo, title);

  // ── Spacer ──
  const spacer = document.createElement("div");
  spacer.className = "flex-1";

  // ── Right: action buttons ──
  const right = document.createElement("div");
  right.className = "flex items-center gap-1";

  const themeBtn = createThemeToggle();

  // Subtle divider between theme toggle and action buttons
  const divider = document.createElement("div");
  divider.className = "w-px h-4 mx-1";
  divider.style.backgroundColor = "var(--divider)";

  const resetBtn = iconButton(Icons.reset, "Reset flag", () => {
    resetBtn.dispatchEvent(new CustomEvent("topbar:reset", { bubbles: true }));
  });

  const saveBtn = iconButton(Icons.save, "Save project", () => {
    /* TODO: wire to save */
  });

  const exportBtn = createExportButton();

  right.append(themeBtn, divider, resetBtn, saveBtn, exportBtn);

  // Create the screen-reader live region for export error announcements.
  // It must exist in the DOM before any error content is injected so
  // assistive technologies register the aria-live contract.
  const liveRegion = ensureExportLiveRegion();
  header.appendChild(liveRegion);

  header.append(left, spacer, right);
  return header;
}
