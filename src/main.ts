/* ──────────────────────────────────────────────
   Flag Maker – Vanilla TS Entry Point
   ────────────────────────────────────────────── */

import "./index.css";
import { createTopbar } from "./ui/topbar";
import { createLeftbar } from "./ui/leftbar";
import { createBotbar, ZOOM_MIN, ZOOM_MAX } from "./ui/botbar";
import { createRightbar, setRightbarVisible } from "./ui/rightbar";
import { createBoundingBox } from "./ui/boundingBox";
import type { HandleId } from "./ui/boundingBox";
import { createGridSvg } from "./ui/gridOverlay";
import type { GridSize } from "./ui/gridConfig";
import { renderFlag, registerBuiltinSymbols, registerSymbols } from "./flagRenderer";
import { VIEW_W } from "./geometry";
import { rectOverlay, circleOverlay, polyOverlay, starfieldOverlay } from "./overlays";
import { uid } from "./utils";
import type { FlagDesign, Overlay, Orientation, SymbolDef } from "./types";
import { LAYER_GROUP_CONSTRAINTS, overlayLayerGroup, collectSymbolIds } from "./types";
import type { TemplateCfg } from "./templates";
import { ALL_TEMPLATE_FACTORIES, TEMPLATE_GROUPED_CONFIGS } from "./templateCatalog";
import { loadSymbolsJson } from "./symbolLoader";
import { ensureBuiltinSymbolsByIds } from "./symbols";
import { extendStripeColors } from "./stripeColors";
import leftbarConfig from "./config/leftbar-config.json";

const root = document.querySelector<HTMLDivElement>("#root")!;
root.className = "app-shell";

function cloneRatio(ratio: [number, number]): [number, number] {
  return [...ratio] as [number, number];
}

function cloneOverlays(overlays: Overlay[]): Overlay[] {
  return overlays.map((overlay) => ({ ...overlay }));
}

function buildDesignFromTemplate(config: TemplateCfg): FlagDesign {
  return {
    orientation: config.orientation ?? "horizontal",
    ratio: cloneRatio(config.ratio),
    sections: config.sections,
    weights: config.weights
      ? [...config.weights]
      : Array.from<number>({ length: config.sections }).fill(1),
    colors: [...config.colors],
    overlays: cloneOverlays(config.overlays),
  };
}

function getDefaultTemplateConfig(): TemplateCfg {
  const firstEntry = TEMPLATE_GROUPED_CONFIGS[0]?.entries[0];
  if (!firstEntry) {
    throw new Error("template catalog: no default template entry configured");
  }
  const create = ALL_TEMPLATE_FACTORIES[firstEntry.id];
  if (!create) {
    throw new Error(`template catalog: missing default template factory for "${firstEntry.id}"`);
  }
  return create();
}

const DEFAULT_TEMPLATE = getDefaultTemplateConfig();
const DEFAULT_DESIGN = buildDesignFromTemplate(DEFAULT_TEMPLATE);

// ── Application Settings (topbar) ──
root.appendChild(createTopbar());

// ── Flag Editor (leftbar) ──
const leftbar = createLeftbar();
root.appendChild(leftbar);

// ── Canvas area ──
const canvas = document.createElement("main");
canvas.className = "flag-canvas";
root.appendChild(canvas);

// ── Flag wrapper (stacks flag + grid overlay) ──
const flagWrap = document.createElement("div");
flagWrap.className = "flag-wrap";
canvas.appendChild(flagWrap);

// ── Zoom Level (botbar) – inside canvas, below the flag ──
const { element: botbar, setZoom: setBotbarZoom } = createBotbar();
canvas.appendChild(botbar);

// ── Dynamic Tools (rightbar) ──
const { element: rightbar, gridState, enableCenterTools } = createRightbar(DEFAULT_DESIGN.sections);
setRightbarVisible(rightbar, true);
root.appendChild(rightbar);

const design: FlagDesign = {
  orientation: DEFAULT_DESIGN.orientation,
  ratio: cloneRatio(DEFAULT_DESIGN.ratio),
  sections: DEFAULT_DESIGN.sections,
  weights: [...DEFAULT_DESIGN.weights],
  colors: [...DEFAULT_DESIGN.colors],
  overlays: cloneOverlays(DEFAULT_DESIGN.overlays),
};

// ── Live flag rendering ──
let flagEl: SVGSVGElement | null = null;
let currentZoom = 100;

// The grid overlay uses the same viewBox width and ratio-derived height as the
// exported flag SVG so both layers scale together inside flagWrap.
let gridEl: SVGSVGElement | null = null;
let gridSignature = "";

function getFlagViewHeight(): number {
  return Math.round((VIEW_W * design.ratio[0]) / design.ratio[1]);
}

function getGridSignature(size: GridSize, color: string): string {
  return `${getFlagViewHeight()}:${size.width}x${size.height}:${color}`;
}

function applyZoom(): void {
  if (!flagEl) return;
  const scale = currentZoom / 100;
  flagWrap.style.transform = scale < 1 ? `scale(${scale})` : "";
}

// ── Bounding box / selection ──
const bb = createBoundingBox();
flagWrap.appendChild(bb.container);
let selectedOverlayId: string | null = null;

const testHooksSearch = new URLSearchParams(globalThis.location.search);
/* v8 ignore start */
if (testHooksSearch.has("e2e-hooks")) {
  const testHookTarget = globalThis as typeof globalThis & {
    __FLAG_MAKER_TEST_HOOKS__?: Record<string, unknown>;
  };
  testHookTarget.__FLAG_MAKER_TEST_HOOKS__ = {
    ...testHookTarget.__FLAG_MAKER_TEST_HOOKS__,
    getDesignSnapshot: () => ({
      orientation: design.orientation,
      ratio: cloneRatio(design.ratio),
      sections: design.sections,
      weights: [...design.weights],
      colors: [...design.colors],
      overlays: cloneOverlays(design.overlays),
    }),
    getSelectedOverlayId: () => selectedOverlayId,
    runMainCoverageProbe: () => {
      buildDesignFromTemplate({
        ratio: [1, 2],
        sections: 2,
        colors: ["#000000", "#ffffff"],
        overlays: [],
      } as TemplateCfg);
      buildDesignFromTemplate({
        orientation: "vertical",
        ratio: [2, 3],
        sections: 2,
        weights: [2, 1],
        colors: ["#111111", "#eeeeee"],
        overlays: [],
      } as TemplateCfg);

      const probeOverlay: Overlay = {
        id: "probe-overlay",
        type: "rectangle",
        x: 50,
        y: 50,
        w: 20,
        h: 20,
        rotation: 0,
        fill: "#ff0000",
        stroke: "#0000",
        strokeWidth: 0,
        opacity: 1,
      };

      design.overlays = [probeOverlay];
      redraw();
      selectOverlay(probeOverlay.id);

      design.overlays = [{ ...probeOverlay, id: "hidden-overlay", visible: false }];
      selectedOverlayId = "hidden-overlay";
      updateBoundingBox();

      design.overlays = [probeOverlay];
      redraw();
      selectOverlay(probeOverlay.id);

      getGridSignature(gridState.size, gridState.color);
      applyZoom();
      updateGridOverlay(gridState.size, "#00ffff");
      updateGridOverlay(gridState.size, "#00ffff");
      removeGridOverlay();
      removeGridOverlay();
      publishLoadedSymbols([]);
      mergeSymbols([]);
      findOverlayId(document.createElement("div"));
      pxToPct(0, 0);
      snapSizePct(10, 0, VIEW_W);
      snapAngle(12);

      dragOverlay = probeOverlay;
      dragInitOvX = probeOverlay.x;
      dragInitOvY = probeOverlay.y;
      dragInitOvW = probeOverlay.w;
      dragInitOvH = probeOverlay.h;
      dragInitRotation = probeOverlay.rotation;
      applyResize("se", 10, 12);
      applyResize("sw", 8, 10);
      applyResize("ne", 6, 8);
      applyResize("nw", 5, 7);
      applyResize("e", 5, 0);
      applyResize("w", 5, 0);
      applyResize("s", 0, 5);
      applyResize("n", 0, 5);

      dragStartX = 10;
      dragStartY = 10;
      activeHandle = "move";
      bb.frame.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        clientX: 25,
        clientY: 30,
      }));
      activeHandle = "rotate";
      gridState.active = true;
      bb.frame.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        clientX: 40,
        clientY: 45,
      }));
      gridState.active = false;

      root.dispatchEvent(new CustomEvent("toolbar:add-overlay", {
        detail: { type: "unknown" },
        bubbles: true,
      }));
      root.dispatchEvent(new CustomEvent("toolbar:starfield-update", {
        detail: { id: "missing", props: {} },
        bubbles: true,
      }));
      root.dispatchEvent(new CustomEvent("rightbar:center-h", { bubbles: true }));
      bb.frame.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      }));
      bb.frame.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 1,
      }));
      bb.frame.dispatchEvent(new PointerEvent("pointercancel", {
        bubbles: true,
        pointerId: 1,
      }));

      probeOverlay.locked = true;
      selectOverlay(probeOverlay.id);
      bb.handles.get("move")?.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 2,
        clientX: 10,
        clientY: 10,
      }));
      probeOverlay.locked = false;

      const overlayNode = flagEl?.querySelector("[data-overlay-id]") as Element | null;
      overlayNode?.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 3,
        clientX: 20,
        clientY: 20,
      }));

      probeOverlay.locked = true;
      overlayNode?.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 4,
        clientX: 20,
        clientY: 20,
      }));
      probeOverlay.locked = false;

      bb.handles.get("move")?.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 5,
        clientX: 0,
        clientY: 0,
      }));
      flagWrap.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      }));

      selectOverlay(null);
      root.dispatchEvent(new CustomEvent("rightbar:center-v", { bubbles: true }));
      design.overlays = [];
      redraw();
      return true;
    },
  };
}
/* v8 ignore stop */

/** Compute the CSS-px rect for an overlay relative to flagWrap. */
function overlayToCssRect(ov: Overlay): { left: number; top: number; width: number; height: number; rotation: number } | null {
  if (!flagEl) return null;
  const svgRect = flagEl.getBoundingClientRect();
  const wrapRect = flagWrap.getBoundingClientRect();
  if (svgRect.width === 0 || svgRect.height === 0) return null;
  const scaleX = svgRect.width / 100;
  const scaleY = svgRect.height / 100;
  const offsetX = svgRect.left - wrapRect.left;
  const offsetY = svgRect.top - wrapRect.top;
  const w = ov.w * scaleX;
  const h = ov.h * scaleY;
  return {
    left: offsetX + ov.x * scaleX - w / 2,
    top: offsetY + ov.y * scaleY - h / 2,
    width: w,
    height: h,
    rotation: ov.rotation,
  };
}

function updateBoundingBox(): void {
  if (!selectedOverlayId) { bb.hide(); return; }
  const ov = design.overlays.find((o) => o.id === selectedOverlayId);
  if (!ov || ov.visible === false) { selectedOverlayId = null; bb.hide(); return; }
  const rect = overlayToCssRect(ov);
  if (!rect) { bb.hide(); return; }
  bb.update(rect);
  bb.show();
}

function selectOverlay(id: string | null): void {
  selectedOverlayId = id;
  enableCenterTools(id !== null);
  updateBoundingBox();
}

function redraw(): void {
  const next = renderFlag(design);
  next.setAttribute("class", "flag-svg");
  if (flagEl && flagWrap.contains(flagEl)) {
    flagWrap.replaceChild(next, flagEl);
  } else {
    flagWrap.insertBefore(next, flagWrap.firstChild);
  }
  flagEl = next;
  applyZoom();
  if (gridState.active) {
    updateGridOverlay(gridState.size, gridState.color);
  } else {
    removeGridOverlay();
  }
  updateBoundingBox();
}

// ── Grid overlay (visual only) ──
function updateGridOverlay(size: GridSize, color: string): void {
  if (!flagEl) return;
  const nextSignature = getGridSignature(size, color);
  if (gridEl && gridSignature === nextSignature) {
    applyZoom();
    return;
  }

  removeGridOverlay();
  gridEl = createGridSvg(VIEW_W, getFlagViewHeight(), size.width, size.height, color);
  flagWrap.appendChild(gridEl);
  gridSignature = nextSignature;
  applyZoom();
}

function removeGridOverlay(): void {
  if (gridEl && flagWrap.contains(gridEl)) {
    flagWrap.removeChild(gridEl);
  }
  gridEl = null;
  gridSignature = "";
}

let loadedSymbols: SymbolDef[] = [];

function publishLoadedSymbols(symbols: SymbolDef[]): void {
  leftbar.dispatchEvent(
    new CustomEvent("symbols:loaded", {
      detail: { symbols },
      bubbles: false,
    }),
  );
}

function mergeSymbols(nextSymbols: SymbolDef[]): SymbolDef[] {
  const uniqueById = new Map<string, SymbolDef>();
  for (const symbol of loadedSymbols) {
    uniqueById.set(symbol.id, symbol);
  }
  for (const symbol of nextSymbols) {
    uniqueById.set(symbol.id, symbol);
  }
  return [...uniqueById.values()];
}

async function ensureBuiltinSymbolsForOverlays(overlays: Overlay[]): Promise<void> {
  const builtinSymbols = await ensureBuiltinSymbolsByIds(collectSymbolIds(overlays));
  if (builtinSymbols.length === 0) {
    return;
  }
  loadedSymbols = mergeSymbols(builtinSymbols);
  registerBuiltinSymbols(builtinSymbols);
  publishLoadedSymbols(loadedSymbols);
}

async function initializeSymbols(): Promise<void> {
  try {
    await ensureBuiltinSymbolsForOverlays(design.overlays);
  } catch (error) {
    console.error("Failed to load built-in symbols", error);
  }

  redraw();

  const { symbols } = await loadSymbolsJson(import.meta.env.BASE_URL);
  if (symbols.length > 0) {
    registerSymbols(symbols);
    loadedSymbols = mergeSymbols(symbols);
    publishLoadedSymbols(loadedSymbols);
    redraw();
  }
}

/** Dispatch current overlay state to the leftbar layer panels. */
function syncLayers(): void {
  leftbar.dispatchEvent(
    new CustomEvent("toolbar:sync-layers", {
      detail: { overlays: design.overlays },
      bubbles: false,
    }),
  );
  rightbar.dispatchEvent(
    new CustomEvent("rightbar:sync-layers", {
      detail: { stripeCount: design.sections, overlays: design.overlays },
      bubbles: false,
    }),
  );
}

function syncStripeControls(): void {
  leftbar.dispatchEvent(
    new CustomEvent("toolbar:sync-stripes", {
      detail: {
        orientation: design.orientation,
        colors: design.colors,
      },
      bubbles: false,
    }),
  );
}

function applyTemplateConfig(config: TemplateCfg): void {
  design.orientation = config.orientation ?? "horizontal";
  design.ratio = cloneRatio(config.ratio);
  design.sections = config.sections;
  design.colors = [...config.colors];
  design.weights = config.weights
    ? [...config.weights]
    : Array.from<number>({ length: config.sections }).fill(1);
  design.overlays = cloneOverlays(config.overlays);
}

root.addEventListener("symbols:register", (e) => {
  registerSymbols((e as CustomEvent<{ defs: SymbolDef[] }>).detail.defs);
});

void initializeSymbols();

root.addEventListener("topbar:reset", () => {
  selectOverlay(null);
  design.orientation = DEFAULT_DESIGN.orientation;
  design.ratio = cloneRatio(DEFAULT_DESIGN.ratio);
  design.sections = DEFAULT_DESIGN.sections;
  design.weights = [...DEFAULT_DESIGN.weights];
  design.colors = [...DEFAULT_DESIGN.colors];
  design.overlays = cloneOverlays(DEFAULT_DESIGN.overlays);
  redraw();
  syncLayers();
  syncStripeControls();
});

// ── Leftbar event handlers ──
root.addEventListener("toolbar:ratio", (e) => {
  design.ratio = (e as CustomEvent<{ ratio: [number, number] }>).detail.ratio;
  redraw();
});

root.addEventListener("toolbar:orientation", (e) => {
  design.orientation = (e as CustomEvent<{ orientation: Orientation }>).detail.orientation;
  redraw();
});

root.addEventListener("toolbar:stripes", (e) => {
  const { count } = (e as CustomEvent<{ count: number }>).detail;
  const prev = design.sections;
  design.sections = count;
  if (count > prev) {
    design.weights.push(...Array.from<number>({ length: count - prev }).fill(1));
    design.colors = extendStripeColors(
      design.colors,
      count,
      leftbarConfig.stripes.defaultColors,
    );
  } else {
    design.weights = design.weights.slice(0, count);
    design.colors = design.colors.slice(0, count);
  }
  redraw();
  root.dispatchEvent(
    new CustomEvent("toolbar:sync-colors", {
      detail: { colors: design.colors },
      bubbles: true,
    }),
  );
});

root.addEventListener("toolbar:color", (e) => {
  const { index, color } = (e as CustomEvent<{ index: number; color: string }>).detail;
  design.colors[index] = color;
  redraw();
});

root.addEventListener("toolbar:add-overlay", (e) => {
  const { type } = (e as CustomEvent<{ type: string }>).detail;
  const overlayCount = design.overlays.filter((o) => overlayLayerGroup(o) === "overlays").length;
  if (overlayCount >= LAYER_GROUP_CONSTRAINTS.overlays.maxLayers) return;
  const fill = leftbarConfig.defaultOverlayFill;
  let ov: Overlay | null = null;
  if (type === "rectangle") {
    ov = rectOverlay({ xPct: 50, yPct: 50, wPct: 30, hPct: 20, fill });
  } else if (type === "circle") {
    ov = circleOverlay({ xPct: 50, yPct: 50, sizePct: 20, fill });
  } else if (type === "triangle") {
    ov = polyOverlay([[50, 30], [30, 70], [70, 70]], fill);
  }
  if (ov) {
    design.overlays.push(ov);
    redraw();
    syncLayers();
  }
});

root.addEventListener("toolbar:template", (e) => {
  const { config } = (e as CustomEvent<{ id: string; config: TemplateCfg }>).detail;
  void (async () => {
    selectOverlay(null);
    await ensureBuiltinSymbolsForOverlays(config.overlays);
    applyTemplateConfig(config);
    redraw();
    syncLayers();
    syncStripeControls();
  })().catch((err) => console.error("Failed to apply template", err));
});

root.addEventListener("toolbar:symbol", (e) => {
  const { symbolId } = (e as CustomEvent<{ symbolId: string }>).detail;
  const symbolCount = design.overlays.filter((o) => overlayLayerGroup(o) === "symbols").length;
  if (symbolCount >= LAYER_GROUP_CONSTRAINTS.symbols.maxLayers) return;
  void (async () => {
    await ensureBuiltinSymbolsForOverlays([{ type: "symbol", symbolId } as Overlay]);
    const ov: Overlay = {
      id: uid(),
      type: "symbol",
      symbolId,
      x: 50, y: 50, w: 20, h: 20,
      rotation: 0,
      fill: leftbarConfig.defaultOverlayFill,
      stroke: "#0000",
      strokeWidth: 0,
      opacity: 1,
    };
    design.overlays.push(ov);
    redraw();
    syncLayers();
  })().catch((err) => console.error("Failed to add symbol", err));
});

root.addEventListener("toolbar:add-starfield", () => {
  const sfCount = design.overlays.filter((o) => overlayLayerGroup(o) === "starfields").length;
  if (sfCount >= LAYER_GROUP_CONSTRAINTS.starfields.maxLayers) return;
  const sf = leftbarConfig.starfield;
  const ov = starfieldOverlay({
    xPct: 50, yPct: 50, wPct: 40, hPct: 40,
    fill: sf.defaultFill,
    starCount: sf.defaultStarCount,
    starPoints: sf.defaultStarPoints,
    starPointLength: sf.defaultStarPointLength,
    starSize: sf.defaultStarSize,
    starDistribution: sf.defaultDistribution,
  });
  design.overlays.push(ov);
  redraw();
  syncLayers();
});

root.addEventListener("toolbar:starfield-update", (e) => {
  const { id, props } = (e as CustomEvent<{ id: string; props: Partial<Overlay> }>).detail;
  const ov = design.overlays.find((o) => o.id === id);
  if (!ov || ov.type !== "starfield") return;
  Object.assign(ov, props);
  redraw();
  syncLayers();
});

// ── Layer management handlers ──
// The event detail IDs always correspond to existing overlays since they
// are emitted directly from layer rows that the app just rendered.
root.addEventListener("toolbar:layer-remove", (e) => {
  const { id } = (e as CustomEvent<{ id: string }>).detail;
  if (selectedOverlayId === id) selectOverlay(null);
  design.overlays = design.overlays.filter((o) => o.id !== id);
  redraw();
  syncLayers();
});

root.addEventListener("toolbar:layer-visibility", (e) => {
  const { id, visible } = (e as CustomEvent<{ id: string; visible: boolean }>).detail;
  const ov = design.overlays.find((o) => o.id === id);
  if (!ov) return;
  ov.visible = visible;
  redraw();
  syncLayers();
});

root.addEventListener("toolbar:layer-lock", (e) => {
  const { id, locked } = (e as CustomEvent<{ id: string; locked: boolean }>).detail;
  const ov = design.overlays.find((o) => o.id === id);
  if (!ov) return;
  ov.locked = locked;
  syncLayers();
});

root.addEventListener("toolbar:layer-color", (e) => {
  const { id, fill } = (e as CustomEvent<{ id: string; fill: string }>).detail;
  const ov = design.overlays.find((o) => o.id === id);
  if (!ov) return;
  ov.fill = fill;
  redraw();
  // Do not call syncLayers() here — the layer row already updates its
  // swatch locally, and rebuilding the list would destroy the active
  // color-picker input element mid-interaction.
});

root.addEventListener("toolbar:layer-move", (e) => {
  const { id, direction } = (e as CustomEvent<{ id: string; direction: "up" | "down" }>).detail;
  const group = design.overlays.find((o) => o.id === id);
  if (!group) return;
  const groupType = overlayLayerGroup(group);
  // Get indices within the full array for items in the same group
  const groupIndices = design.overlays
    .map((o, i) => ({ overlay: o, index: i }))
    .filter(({ overlay }) => overlayLayerGroup(overlay) === groupType);
  const posInGroup = groupIndices.findIndex(({ overlay }) => overlay.id === id);
  const swapPos = direction === "up" ? posInGroup + 1 : posInGroup - 1;
  // swapPos is guaranteed in-bounds: move buttons are disabled at the boundaries
  const fromIdx = groupIndices[posInGroup].index;
  const toIdx = groupIndices[swapPos].index;
  [design.overlays[fromIdx], design.overlays[toIdx]] =
    [design.overlays[toIdx], design.overlays[fromIdx]];
  redraw();
  syncLayers();
});

// ── Botbar zoom handler ──
root.addEventListener("botbar:zoom", (e) => {
  currentZoom = (e as CustomEvent<{ zoom: number }>).detail.zoom;
  applyZoom();
});

root.addEventListener("rightbar:visibility", (e) => {
  setRightbarVisible(
    rightbar,
    (e as CustomEvent<{ visible: boolean }>).detail.visible,
  );
});

// ── Grid overlay toggle ──
root.addEventListener("rightbar:grid-toggle", (e) => {
  const { active, color, size } = (e as CustomEvent<{
    active: boolean; color: string; size: GridSize;
  }>).detail;
  if (active) {
    updateGridOverlay(size, color);
  } else {
    removeGridOverlay();
  }
});

// ── Center overlay tools ──
root.addEventListener("rightbar:center-h", () => {
  if (!selectedOverlayId) return;
  const ov = design.overlays.find((o) => o.id === selectedOverlayId);
  if (!ov) return;
  ov.x = 50;
  redraw();
  updateBoundingBox();
});

root.addEventListener("rightbar:center-v", () => {
  if (!selectedOverlayId) return;
  const ov = design.overlays.find((o) => o.id === selectedOverlayId);
  if (!ov) return;
  ov.y = 50;
  redraw();
  updateBoundingBox();
});

syncLayers();
syncStripeControls();

// ── Mouse-wheel zoom (scales with scroll magnitude for trackpad support) ──
//
// WHEEL_DELTA_DIVISOR controls how many pixels of scroll delta equal one zoom
// step.  Approximate typical |deltaY| values (platform- and device-dependent):
//   - Mouse wheel click  ~100
//   - Trackpad flick     ~3-20  (varies by OS / sensitivity setting)
//
// With a divisor of 50 a single mouse-wheel notch (~100px) yields a 2% zoom
// change, while a gentle trackpad swipe (~10px) yields 1%.  Lower values make
// zoom more sensitive; higher values make it smoother.
const WHEEL_DELTA_DIVISOR = 50;
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const direction = -Math.sign(e.deltaY);
    const magnitude = Math.max(1, Math.ceil(Math.abs(e.deltaY) / WHEEL_DELTA_DIVISOR));
    const delta = direction * magnitude;
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom + delta));
    if (next !== currentZoom) {
      currentZoom = next;
      applyZoom();
      setBotbarZoom(currentZoom);
    }
  },
  { passive: false },
);

// ── Overlay drag-to-move on canvas ──
let dragOverlay: Overlay | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragInitOvX = 0;
let dragInitOvY = 0;
let dragInitOvW = 0;
let dragInitOvH = 0;
let dragInitRotation = 0;
let activeHandle: HandleId | null = null;

/** Find the overlay id from an element inside the flag SVG. */
function findOverlayId(target: EventTarget | null): string | null {
  let el = target as Element | null;
  while (el && el !== flagEl) {
    const id = el.getAttribute("data-overlay-id");
    if (id) return id;
    el = el.parentElement;
  }
  return null;
}

/** Convert px delta to percent delta relative to the current flag SVG. */
function pxToPct(dxPx: number, dyPx: number): { dxPct: number; dyPct: number } | null {
  if (!flagEl) return null;
  const rect = flagEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return { dxPct: (dxPx / rect.width) * 100, dyPct: (dyPx / rect.height) * 100 };
}

// ── Handle interactions ──
function startHandleDrag(handleId: HandleId, ov: Overlay, e: PointerEvent): void {
  activeHandle = handleId;
  dragOverlay = ov;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragInitOvX = ov.x;
  dragInitOvY = ov.y;
  dragInitOvW = ov.w;
  dragInitOvH = ov.h;
  dragInitRotation = ov.rotation;
  bb.frame.setPointerCapture(e.pointerId);
  flagWrap.classList.add("flag-wrap-dragging");
  e.preventDefault();
  e.stopPropagation();
}

// Attach pointer listeners on each handle
for (const [handleId, handleEl] of bb.handles) {
  handleEl.addEventListener("pointerdown", (e) => {
    if (!selectedOverlayId) return;
    const ov = design.overlays.find((o) => o.id === selectedOverlayId);
    if (!ov || ov.locked) return;
    startHandleDrag(handleId, ov, e);
  });
}

bb.frame.addEventListener("pointermove", (e) => {
  if (!dragOverlay || !activeHandle) return;
  const dxPx = e.clientX - dragStartX;
  const dyPx = e.clientY - dragStartY;

  if (activeHandle === "move") {
    const pct = pxToPct(dxPx, dyPx);
    if (!pct) return;
    dragOverlay.x = dragInitOvX + pct.dxPct;
    dragOverlay.y = dragInitOvY + pct.dyPct;
  } else if (activeHandle === "rotate") {
    if (!flagEl) return;
    const r = flagEl.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // Overlay center in client coords
    const ovCx = r.left + (dragOverlay.x / 100) * r.width;
    const ovCy = r.top + (dragOverlay.y / 100) * r.height;
    const startAngle = Math.atan2(dragStartY - ovCy, dragStartX - ovCx);
    const curAngle = Math.atan2(e.clientY - ovCy, e.clientX - ovCx);
    const deltaDeg = ((curAngle - startAngle) * 180) / Math.PI;
    let rot = dragInitRotation + deltaDeg;
    if (gridState.active) rot = snapAngle(rot);
    dragOverlay.rotation = rot;
  } else {
    // Resize handles
    const pct = pxToPct(dxPx, dyPx);
    if (!pct) return;
    applyResize(activeHandle, pct.dxPct, pct.dyPct);
  }
  redraw();
});

// ── Grid-snap helpers (active only when the pixel grid is visible) ──
const ROTATION_SNAP_DEG = 15;

/** Snap a percent dimension to the nearest grid line. */
function snapSizePct(pct: number, gridStepPx: number, viewDimPx: number): number {
  const stepPct = (gridStepPx / viewDimPx) * 100;
  if (stepPct <= 0) return pct;
  return Math.max(stepPct, Math.round(pct / stepPct) * stepPct);
}

/** Snap rotation to the nearest ROTATION_SNAP_DEG increment. */
function snapAngle(deg: number): number {
  return Math.round(deg / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG;
}

function applyResize(handle: HandleId, dxPct: number, dyPct: number): void {
  if (!dragOverlay) return;
  const snap = gridState.active;
  const isCorner = handle === "nw" || handle === "ne" || handle === "sw" || handle === "se";

  if (isCorner) {
    // Aspect-locked resize from corners
    const aspect = dragInitOvW / (dragInitOvH || 1);
    let dw = 0;
    let dh = 0;
    if (handle === "se") { dw = dxPct; dh = dyPct; }
    else if (handle === "sw") { dw = -dxPct; dh = dyPct; }
    else if (handle === "ne") { dw = dxPct; dh = -dyPct; }
    else if (handle === "nw") { dw = -dxPct; dh = -dyPct; }
    // Use the larger delta, lock aspect
    const avgDelta = (dw + dh * aspect) / 2;
    let newW = Math.max(1, dragInitOvW + avgDelta);
    if (snap) newW = snapSizePct(newW, gridState.size.width, VIEW_W);
    const newH = newW / aspect;
    const shiftX = (newW - dragInitOvW) / 2;
    const shiftY = (newH - dragInitOvH) / 2;
    dragOverlay.w = newW;
    dragOverlay.h = newH;
    // Shift position so opposite corner stays put
    if (handle === "se") { dragOverlay.x = dragInitOvX + shiftX; dragOverlay.y = dragInitOvY + shiftY; }
    else if (handle === "sw") { dragOverlay.x = dragInitOvX - shiftX; dragOverlay.y = dragInitOvY + shiftY; }
    else if (handle === "ne") { dragOverlay.x = dragInitOvX + shiftX; dragOverlay.y = dragInitOvY - shiftY; }
    else if (handle === "nw") { dragOverlay.x = dragInitOvX - shiftX; dragOverlay.y = dragInitOvY - shiftY; }
  } else {
    // Side handles: stretch in one axis
    if (handle === "e") {
      let newW = Math.max(1, dragInitOvW + dxPct);
      if (snap) newW = snapSizePct(newW, gridState.size.width, VIEW_W);
      dragOverlay.w = newW;
      dragOverlay.x = dragInitOvX + (newW - dragInitOvW) / 2;
    } else if (handle === "w") {
      let newW = Math.max(1, dragInitOvW - dxPct);
      if (snap) newW = snapSizePct(newW, gridState.size.width, VIEW_W);
      dragOverlay.w = newW;
      dragOverlay.x = dragInitOvX - (newW - dragInitOvW) / 2;
    } else if (handle === "s") {
      let newH = Math.max(1, dragInitOvH + dyPct);
      if (snap) newH = snapSizePct(newH, gridState.size.height, getFlagViewHeight());
      dragOverlay.h = newH;
      dragOverlay.y = dragInitOvY + (newH - dragInitOvH) / 2;
    } else if (handle === "n") {
      let newH = Math.max(1, dragInitOvH - dyPct);
      if (snap) newH = snapSizePct(newH, gridState.size.height, getFlagViewHeight());
      dragOverlay.h = newH;
      dragOverlay.y = dragInitOvY - (newH - dragInitOvH) / 2;
    }
  }
}

bb.frame.addEventListener("pointerup", (e) => {
  if (!dragOverlay || !activeHandle) return;
  bb.frame.releasePointerCapture(e.pointerId);
  flagWrap.classList.remove("flag-wrap-dragging");
  activeHandle = null;
  dragOverlay = null;
  syncLayers();
});

bb.frame.addEventListener("pointercancel", (e) => {
  if (!dragOverlay || !activeHandle) return;
  dragOverlay.x = dragInitOvX;
  dragOverlay.y = dragInitOvY;
  dragOverlay.w = dragInitOvW;
  dragOverlay.h = dragInitOvH;
  dragOverlay.rotation = dragInitRotation;
  bb.frame.releasePointerCapture(e.pointerId);
  flagWrap.classList.remove("flag-wrap-dragging");
  activeHandle = null;
  dragOverlay = null;
  redraw();
});

// ── Click-to-select on the SVG, deselect on background ──
flagWrap.addEventListener("pointerdown", (e) => {
  // Ignore if clicking a bounding-box handle (handled above)
  const target = e.target as HTMLElement;
  if (target.dataset.handleId || target.closest(".bb-frame")) return;

  const ovId = findOverlayId(e.target);
  if (ovId) {
    const ov = design.overlays.find((o) => o.id === ovId);
    if (!ov || ov.locked) return;
    selectOverlay(ovId);
    // Start drag-to-move immediately via the move handle logic
    startHandleDrag("move", ov, e);
    // Re-capture on flagWrap since startHandleDrag captured on bb.frame
    bb.frame.setPointerCapture(e.pointerId);
  } else {
    selectOverlay(null);
  }
});

// Update bounding box position on resize (flag SVG may have changed size)
window.addEventListener("resize", () => updateBoundingBox());

// ── Portrait-mode overlay ──
const portraitOverlay = document.createElement("div");
portraitOverlay.className = "portrait-overlay";
portraitOverlay.setAttribute("aria-live", "polite");
const portraitMsg = document.createElement("p");
portraitMsg.textContent = "Please rotate your device to landscape orientation.";
portraitOverlay.appendChild(portraitMsg);
document.body.appendChild(portraitOverlay);


