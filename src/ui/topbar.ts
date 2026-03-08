/* ──────────────────────────────────────────────
   Flag Maker – Application Settings (topbar)
   Windows 11–inspired compact title bar with
   global app actions.
   ────────────────────────────────────────────── */

import { svg } from "./icons";
import { getCurrentSvg } from "../flagRenderer";
import { download, svgToPng } from "../utils";

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
      svgToPng(svgEl, 2).then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "flag.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }).catch(() => {
        /* PNG export failed (e.g. canvas tainted or unsupported) */
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
    /* TODO: wire to flag state reset */
  });

  const saveBtn = iconButton(Icons.save, "Save project", () => {
    /* TODO: wire to save */
  });

  const exportBtn = createExportButton();

  right.append(themeBtn, divider, resetBtn, saveBtn, exportBtn);

  header.append(left, spacer, right);
  return header;
}
