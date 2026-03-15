/* ──────────────────────────────────────────────
   Flag Maker – Dynamic Tools (rightbar)
  Floating vertical toolbar that remains visible
  while exposing context-sensitive tools.
   ────────────────────────────────────────────── */

import {
  ICON_GRID,
  ICON_GRIP,
  ICON_CENTER_H,
  ICON_CENTER_V,
  ICON_LAYER_STRIPES,
  ICON_LAYER_OVERLAYS,
  ICON_LAYER_STARFIELDS,
  ICON_LAYER_SYMBOLS,
} from "./icons";
import {
  GRID_SIZES,
  DEFAULT_GRID_SIZE,
  GRID_COLOR_CYAN,
  GRID_COLOR_MAGENTA,
  pickGridColor,
} from "./gridOverlay";
import type { GridSize } from "./gridConfig";
import type { Overlay } from "../types";
import { LAYER_GROUP_CONSTRAINTS, overlayLayerGroup } from "../types";
import { getCurrentSvg } from "../flagRenderer";

/** Show/hide the rightbar. */
export function setRightbarVisible(
  bar: HTMLElement,
  visible: boolean,
): void {
  bar.classList.toggle("rightbar-visible", visible);
}

/** Grid color mode: cyan, magenta, or off. */
type GridColorMode = "cyan" | "magenta" | "off";

/** Current grid state exposed for main.ts. */
interface GridState {
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
  /* istanbul ignore else */
  if (svgEl) {
    const svgFills = Array.from(svgEl.querySelectorAll("[fill]"))
      // getAttribute always returns a string since querySelectorAll("[fill]")
      // only matches elements that have the fill attribute.
      .map((el) => el.getAttribute("fill") as string)
      .filter((f) => f.startsWith("#"));
    /* istanbul ignore next */
    const fills = svgFills.length > 0 ? svgFills : ["#ffffff"];
    const color = pickGridColor(fills);
    return color === GRID_COLOR_CYAN ? "cyan" : "magenta";
  } else {
    // No SVG rendered yet; default to white so the contrast check returns the
    // most readable grid color for a typical light background.
    return pickGridColor(["#ffffff"]) === GRID_COLOR_CYAN ? "cyan" : "magenta";
  }
}

function resolveDefaultGridSize(): GridSize {
  const found = GRID_SIZES.find((s) => s.label === DEFAULT_GRID_SIZE);
  /* istanbul ignore else */
  if (found) {
    return found;
  } else {
    return GRID_SIZES[0];
  }
}

export function createRightbar(initialStripeCount: number): { element: HTMLElement; gridState: GridState; enableCenterTools: (enabled: boolean) => void; disconnect: () => void } {
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
  gridBtn.className = "btn btn-ghost btn-sm btn-square rightbar-btn";
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
  const sizeMenu = document.createElement("ul");
  sizeMenu.className = "menu bg-base-300 rounded-box shadow-lg rightbar-grid-menu";
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
    const li = document.createElement("li");
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

    li.appendChild(item);
    sizeMenu.appendChild(li);
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

  // ── Center horizontally / vertically ──
  const centerHBtn = document.createElement("button");
  centerHBtn.type = "button";
  centerHBtn.className = "btn btn-ghost btn-sm btn-square rightbar-btn rightbar-center-btn";
  centerHBtn.innerHTML = ICON_CENTER_H;
  centerHBtn.setAttribute("aria-label", "Center horizontally");
  centerHBtn.title = "Center selected element horizontally";
  centerHBtn.disabled = true;

  const centerVBtn = document.createElement("button");
  centerVBtn.type = "button";
  centerVBtn.className = "btn btn-ghost btn-sm btn-square rightbar-btn rightbar-center-btn";
  centerVBtn.innerHTML = ICON_CENTER_V;
  centerVBtn.setAttribute("aria-label", "Center vertically");
  centerVBtn.title = "Center selected element vertically";
  centerVBtn.disabled = true;

  centerHBtn.addEventListener("click", () => {
    if (centerHBtn.disabled) return;
    bar.dispatchEvent(
      new CustomEvent("rightbar:center-h", { bubbles: true }),
    );
  });

  centerVBtn.addEventListener("click", () => {
    if (centerVBtn.disabled) return;
    bar.dispatchEvent(
      new CustomEvent("rightbar:center-v", { bubbles: true }),
    );
  });

  function enableCenterTools(enabled: boolean): void {
    centerHBtn.disabled = !enabled;
    centerVBtn.disabled = !enabled;
  }

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

  function getCanvasBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const canvas = document.querySelector("main.flag-canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      return { minX: rect.left, minY: rect.top, maxX: rect.right, maxY: rect.bottom };
    }
    return { minX: 0, minY: 0, maxX: window.innerWidth, maxY: window.innerHeight };
  }

  function moveBarTo(left: number, top: number): void {
    const bounds = getCanvasBounds();
    const clampedX = Math.max(bounds.minX, Math.min(left, bounds.maxX - bar.offsetWidth));
    const clampedY = Math.max(bounds.minY, Math.min(top, bounds.maxY - bar.offsetHeight));

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
    // Don't start drag when clicking interactive children (buttons, menus),
    // but always allow drag from the drag handle and its inner icon.
    const target = e.target as HTMLElement;
    const isDragHandle = target === dragHandle || target.closest(".rightbar-drag-handle") !== null;
    if (!isDragHandle && target !== bar && (target.closest("button") || target.closest("[role=\"menu\"]") || target.closest(".rightbar-layer-summary"))) {
      return;
    }
    ensureCustomPosition();
    dragging = true;
    const rect = bar.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    bar.classList.add("rightbar-dragging");
    bar.setPointerCapture?.(e.pointerId);
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
    bar.releasePointerCapture?.(e.pointerId);
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
        Number.parseFloat(bar.style.left) + dx * step,
        Number.parseFloat(bar.style.top) + dy * step,
      );
      e.preventDefault();
      return;
    }

    if (e.key === "Escape") {
      setSizeMenuOpen(false);
    }
  }

  bar.addEventListener("pointerdown", onPointerDown);
  bar.addEventListener("pointermove", onPointerMove);
  bar.addEventListener("pointerup", onPointerUp);
  bar.addEventListener("pointercancel", onPointerUp);
  bar.addEventListener("lostpointercapture", () => onPointerUp());
  dragHandle.addEventListener("keydown", onKeyDown);

  bar.appendChild(dragHandle);
  bar.appendChild(gridWrap);
  bar.appendChild(centerHBtn);
  bar.appendChild(centerVBtn);

  // ── Layer group summary ──
  const layerSummary = document.createElement("div");
  layerSummary.className = "rightbar-layer-summary";
  layerSummary.setAttribute("role", "status");
  layerSummary.setAttribute("aria-label", "Layer groups");

  const LAYER_ICONS: Record<string, string> = {
    stripes: ICON_LAYER_STRIPES,
    overlays: ICON_LAYER_OVERLAYS,
    starfields: ICON_LAYER_STARFIELDS,
    symbols: ICON_LAYER_SYMBOLS,
  };

  function buildSummaryRow(groupId: string, count: number, max: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "rightbar-layer-row";
    row.title = `${groupId}: ${count}/${max}`;

    const icon = document.createElement("span");
    icon.className = "rightbar-layer-icon";
    const iconHtml = LAYER_ICONS[groupId];
    /* istanbul ignore else */
    if (iconHtml !== undefined) {
      icon.innerHTML = iconHtml;
    }
    row.appendChild(icon);

    const badge = document.createElement("span");
    badge.className = "badge badge-sm rightbar-layer-badge";
    badge.textContent = String(count);
    row.appendChild(badge);

    return row;
  }

  function updateLayerSummary(stripeCount: number, overlays: Overlay[]): void {
    layerSummary.innerHTML = "";
    const oCnt = overlays.filter((o) => overlayLayerGroup(o) === "overlays").length;
    const sfCnt = overlays.filter((o) => overlayLayerGroup(o) === "starfields").length;
    const sCnt = overlays.filter((o) => overlayLayerGroup(o) === "symbols").length;
    layerSummary.appendChild(
      buildSummaryRow("stripes", stripeCount, LAYER_GROUP_CONSTRAINTS.stripes.maxLayers),
    );
    layerSummary.appendChild(
      buildSummaryRow("overlays", oCnt, LAYER_GROUP_CONSTRAINTS.overlays.maxLayers),
    );
    layerSummary.appendChild(
      buildSummaryRow("starfields", sfCnt, LAYER_GROUP_CONSTRAINTS.starfields.maxLayers),
    );
    layerSummary.appendChild(
      buildSummaryRow("symbols", sCnt, LAYER_GROUP_CONSTRAINTS.symbols.maxLayers),
    );
  }

  // Initial summary (no overlays at startup)
  updateLayerSummary(initialStripeCount, []);

  bar.addEventListener("rightbar:sync-layers", ((e: Event) => {
    const { stripeCount, overlays } = (e as CustomEvent<{
      stripeCount: number;
      overlays: Overlay[];
    }>).detail;
    updateLayerSummary(stripeCount, overlays);
  }) as EventListener);

  bar.appendChild(layerSummary);

  return { element: bar, gridState, enableCenterTools, disconnect: () => clickController.abort() };
}
