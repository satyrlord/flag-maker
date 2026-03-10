/* ──────────────────────────────────────────────
   Flag Maker – Dynamic Tools (rightbar)
  Floating vertical toolbar that remains visible
  while exposing context-sensitive tools.
   ────────────────────────────────────────────── */

import { ICON_GRID, ICON_GRIP } from "./icons";
import {
  GRID_SIZES,
  DEFAULT_GRID_SIZE,
  GRID_COLOR_CYAN,
  GRID_COLOR_MAGENTA,
  pickGridColor,
} from "./gridOverlay";
import type { GridSize } from "./gridConfig";
import { getCurrentSvg } from "../flagRenderer";

/** Show/hide the rightbar. */
export function setRightbarVisible(
  bar: HTMLElement,
  visible: boolean,
): void {
  bar.classList.toggle("rightbar-visible", visible);
}

/** Grid color mode: cyan, magenta, or off. */
export type GridColorMode = "cyan" | "magenta" | "off";

/** Current grid state exposed for main.ts. */
export interface GridState {
  active: boolean;
  colorMode: GridColorMode;
  color: string;
  size: GridSize;
}

/**
 * Extract fill colors from the currently rendered flag SVG and determine
 * whether cyan or magenta provides the best contrast.
 */
function getAutoGridColorMode(): GridColorMode {
  const svgEl = getCurrentSvg();
  const fills = svgEl
    ? Array.from(svgEl.querySelectorAll("[fill]"))
        .map((el) => el.getAttribute("fill") ?? "")
        .filter((f) => f.startsWith("#"))
    : [];
  const color = pickGridColor(fills.length > 0 ? fills : ["#ffffff"]);
  return color === GRID_COLOR_CYAN ? "cyan" : "magenta";
}

function resolveDefaultGridSize(): GridSize {
  return (
    GRID_SIZES.find((size) => size.label === DEFAULT_GRID_SIZE)
    ?? GRID_SIZES[1]
    ?? GRID_SIZES[0]
  );
}

export function createRightbar(): { element: HTMLElement; gridState: GridState; disconnect: () => void } {
  const bar = document.createElement("div");
  bar.className = "rightbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Dynamic Tools");

  const gridState: GridState = {
    active: false,
    colorMode: "off",
    color: GRID_COLOR_CYAN,
    size: resolveDefaultGridSize(),
  };

  // ── Grid toggle button ──
  const gridWrap = document.createElement("div");
  gridWrap.className = "rightbar-grid-wrap";

  const gridBtn = document.createElement("button");
  gridBtn.type = "button";
  gridBtn.className = "rightbar-btn";
  gridBtn.innerHTML = ICON_GRID;
  gridBtn.setAttribute("aria-label", "Toggle pixel grid");
  gridBtn.setAttribute("aria-pressed", "false");
  gridBtn.setAttribute("aria-haspopup", "menu");
  gridBtn.setAttribute("aria-expanded", "false");
  gridBtn.title = "Click: cycle grid color (cyan / magenta / off)\nScroll: change grid density\nRight-click: pick grid size";

  const CYCLE: GridColorMode[] = ["cyan", "magenta", "off"];
  const COLOR_MAP: Record<string, string> = {
    cyan: GRID_COLOR_CYAN,
    magenta: GRID_COLOR_MAGENTA,
  };

  function applyGridBtnState(): void {
    const active = gridState.colorMode !== "off";
    gridState.active = active;
    gridState.color = COLOR_MAP[gridState.colorMode] ?? GRID_COLOR_CYAN;
    gridBtn.setAttribute("aria-pressed", String(active));
    gridBtn.classList.toggle("rightbar-btn-active", active);
    gridBtn.classList.remove("rightbar-btn-cyan", "rightbar-btn-magenta");
    if (active) {
      gridBtn.classList.add(`rightbar-btn-${gridState.colorMode}`);
    }
  }

  gridBtn.addEventListener("click", () => {
    if (gridState.colorMode === "off") {
      // Auto-detect the best contrasting color for the current flag.
      gridState.colorMode = getAutoGridColorMode();
    } else {
      const idx = CYCLE.indexOf(gridState.colorMode);
      gridState.colorMode = CYCLE[(idx + 1) % CYCLE.length];
    }
    applyGridBtnState();
    bar.dispatchEvent(
      new CustomEvent("rightbar:grid-toggle", {
        detail: {
          active: gridState.active,
          color: gridState.color,
          size: gridState.size,
        },
        bubbles: true,
      }),
    );
  });

  // ── Grid size picker (appears on right-click / long-press) ──
  const sizeMenu = document.createElement("div");
  sizeMenu.className = "rightbar-grid-menu";
  sizeMenu.setAttribute("role", "menu");
  sizeMenu.setAttribute("aria-label", "Grid size");

  function setSizeMenuOpen(open: boolean): void {
    sizeMenu.classList.toggle("menu-open", open);
    gridBtn.setAttribute("aria-expanded", String(open));
  }

  function syncSizeMenu(): void {
    for (const el of sizeMenu.querySelectorAll(".rightbar-grid-menu-item")) {
      const match = el.textContent === gridState.size.label;
      el.classList.toggle("active", match);
      el.setAttribute("aria-checked", String(match));
    }
  }

  function dispatchGridUpdate(): void {
    bar.dispatchEvent(
      new CustomEvent("rightbar:grid-toggle", {
        detail: {
          active: true,
          color: gridState.color,
          size: gridState.size,
        },
        bubbles: true,
      }),
    );
  }

  for (const size of GRID_SIZES) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "rightbar-grid-menu-item";
    if (size.label === gridState.size.label) {
      item.classList.add("active");
    }
    item.textContent = size.label;
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-checked", String(size.label === gridState.size.label));

    item.addEventListener("click", () => {
      gridState.size = size;
      syncSizeMenu();
      setSizeMenuOpen(false);

      if (gridState.active) {
        dispatchGridUpdate();
      }
    });

    sizeMenu.appendChild(item);
  }

  gridBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    setSizeMenuOpen(!sizeMenu.classList.contains("menu-open"));
  });

  // Close menu when clicking outside. The AbortController lets callers
  // clean up this document-level listener when the bar is removed.
  const clickController = new AbortController();
  document.addEventListener(
    "click",
    (e) => {
      if (!gridWrap.contains(e.target as Node)) {
        setSizeMenuOpen(false);
      }
    },
    { signal: clickController.signal },
  );

  // ── Mouse-wheel on grid button cycles through sizes ──
  gridBtn.addEventListener(
    "wheel",
    (e) => {
      if (!gridState.active) return;
      e.preventDefault();
      const dir = Math.sign(e.deltaY); // +1 = scroll down (next), -1 = scroll up (prev)
      const idx = GRID_SIZES.findIndex((s) => s.label === gridState.size.label);
      const next = idx + dir;
      if (next < 0 || next >= GRID_SIZES.length) return;
      gridState.size = GRID_SIZES[next];
      syncSizeMenu();
      dispatchGridUpdate();
    },
    { passive: false },
  );

  gridWrap.appendChild(gridBtn);
  gridWrap.appendChild(sizeMenu);

  // ── Drag handle ──
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "rightbar-drag-handle";
  dragHandle.innerHTML = ICON_GRIP;
  dragHandle.title = "Drag to reposition toolbar. Arrow keys also move it.";
  dragHandle.setAttribute("aria-label", "Drag to reposition toolbar");
  dragHandle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function moveBarTo(left: number, top: number): void {
    const maxX = window.innerWidth - bar.offsetWidth;
    const maxY = window.innerHeight - bar.offsetHeight;
    const clampedX = Math.max(0, Math.min(left, maxX));
    const clampedY = Math.max(0, Math.min(top, maxY));

    bar.style.left = `${clampedX}px`;
    bar.style.top = `${clampedY}px`;
    bar.classList.add("rightbar-custom-pos");
  }

  function ensureCustomPosition(): void {
    if (bar.classList.contains("rightbar-custom-pos")) {
      return;
    }
    const rect = bar.getBoundingClientRect();
    moveBarTo(rect.left, rect.top);
  }

  function onPointerDown(e: PointerEvent): void {
    ensureCustomPosition();
    dragging = true;
    const rect = bar.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    bar.classList.add("rightbar-dragging");
    dragHandle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent): void {
    if (dragging) {
      moveBarTo(e.clientX - offsetX, e.clientY - offsetY);
    }
  }

  function onPointerUp(e?: PointerEvent): void {
    dragging = false;
    bar.classList.remove("rightbar-dragging");
    if (!e) {
      return;
    }
    dragHandle.releasePointerCapture?.(e.pointerId);
  }

  function onKeyDown(e: KeyboardEvent): void {
    const step = e.shiftKey ? 32 : 16;
    const movement = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[e.key];

    if (movement) {
      ensureCustomPosition();
      const [dx, dy] = movement;
      moveBarTo(
        Number.parseFloat(bar.style.left || "0") + dx * step,
        Number.parseFloat(bar.style.top || "0") + dy * step,
      );
      e.preventDefault();
      return;
    }

    if (e.key === "Escape") {
      setSizeMenuOpen(false);
    }
  }

  dragHandle.addEventListener("pointerdown", onPointerDown);
  dragHandle.addEventListener("pointermove", onPointerMove);
  dragHandle.addEventListener("pointerup", onPointerUp);
  dragHandle.addEventListener("pointercancel", onPointerUp);
  dragHandle.addEventListener("lostpointercapture", () => onPointerUp());
  dragHandle.addEventListener("keydown", onKeyDown);

  bar.appendChild(dragHandle);
  bar.appendChild(gridWrap);

  return { element: bar, gridState, disconnect: () => clickController.abort() };
}
