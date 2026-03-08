/* ──────────────────────────────────────────────
   Flag Maker – Vanilla TS Entry Point
   ────────────────────────────────────────────── */

import "./index.css";
import { createTopbar } from "./ui/topbar";
import { createLeftbar } from "./ui/leftbar";
import { createBotbar, ZOOM_MIN, ZOOM_MAX } from "./ui/botbar";
import { createRightbar, setRightbarVisible } from "./ui/rightbar";
import { renderFlag, registerSymbols } from "./flagRenderer";
import { rectOverlay, circleOverlay, starOverlay } from "./overlays";
import { uid } from "./utils";
import type { FlagDesign, Overlay, Orientation, SymbolDef } from "./types";
import type { TemplateCfg } from "./templates";

const root = document.querySelector<HTMLDivElement>("#root")!;
root.className = "app-shell";

// ── Application Settings (topbar) ──
root.appendChild(createTopbar());

// ── Flag Editor (leftbar) ──
const leftbar = createLeftbar();
root.appendChild(leftbar);

// ── Canvas area ──
const canvas = document.createElement("main");
canvas.className = "flag-canvas";
root.appendChild(canvas);

// ── Zoom Level (botbar) – inside canvas, below the flag ──
const { element: botbar, setZoom: setBotbarZoom } = createBotbar();
canvas.appendChild(botbar);

// ── Dynamic Tools (rightbar) ──
const rightbar = createRightbar();
setRightbarVisible(rightbar, false);
root.appendChild(rightbar);

// ── Default flag design ──
const DEFAULT_DESIGN = {
  orientation: "horizontal" as const,
  ratio: [2, 3] as const,
  sections: 3,
  weights: [1, 1, 1],
  colors: ["#CE1126", "#FFFFFF", "#002395"],
  overlays: [] as Overlay[],
} satisfies FlagDesign;

const design: FlagDesign = {
  orientation: DEFAULT_DESIGN.orientation,
  ratio: [...DEFAULT_DESIGN.ratio],
  sections: DEFAULT_DESIGN.sections,
  weights: [...DEFAULT_DESIGN.weights],
  colors: [...DEFAULT_DESIGN.colors],
  overlays: [...DEFAULT_DESIGN.overlays],
};

// ── Live flag rendering ──
let flagEl: SVGSVGElement | null = null;
let currentZoom = 100;

function applyZoom(): void {
  if (!flagEl) return;
  const scale = currentZoom / 100;
  flagEl.style.transform = scale < 1 ? `scale(${scale})` : "";
}

function redraw(): void {
  const next = renderFlag(design);
  next.setAttribute("class", "flag-svg");
  if (flagEl && canvas.contains(flagEl)) {
    canvas.replaceChild(next, flagEl);
  } else {
    canvas.insertBefore(next, botbar);
  }
  flagEl = next;
  applyZoom();
}

redraw();

root.addEventListener("symbols:register", (e) => {
  registerSymbols((e as CustomEvent<{ defs: SymbolDef[] }>).detail.defs);
});

root.addEventListener("topbar:reset", () => {
  design.orientation = DEFAULT_DESIGN.orientation;
  design.ratio = [...DEFAULT_DESIGN.ratio];
  design.sections = DEFAULT_DESIGN.sections;
  design.weights = [...DEFAULT_DESIGN.weights];
  design.colors = [...DEFAULT_DESIGN.colors];
  design.overlays = [];
  redraw();
  leftbar.dispatchEvent(
    new CustomEvent("toolbar:sync-colors", {
      detail: { colors: design.colors },
      bubbles: false,
    }),
  );
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
    design.colors.push(...Array.from<string>({ length: count - prev }).fill("#888888"));
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
  let ov: Overlay | null = null;
  if (type === "star") {
    ov = starOverlay({ xPct: 50, yPct: 50, sizePct: 20, fill: "#FFFFFF" });
  } else if (type === "rectangle") {
    ov = rectOverlay({ xPct: 50, yPct: 50, wPct: 30, hPct: 20, fill: "#FFFFFF" });
  } else if (type === "circle") {
    ov = circleOverlay({ xPct: 50, yPct: 50, sizePct: 20, fill: "#FFFFFF" });
  }
  if (ov) {
    design.overlays.push(ov);
    redraw();
  }
});

root.addEventListener("toolbar:template", (e) => {
  const { config } = (e as CustomEvent<{ id: string; config: TemplateCfg }>).detail;
  design.orientation = config.orientation ?? "horizontal";
  design.ratio = config.ratio;
  design.sections = config.sections;
  design.colors = [...config.colors];
  design.weights = config.weights
    ? [...config.weights]
    : Array.from<number>({ length: config.sections }).fill(1);
  design.overlays = [...config.overlays];
  redraw();
  // Dispatch on leftbar directly: sync-colors must reach the aside listener,
  // which is a child of root — events don't bubble downward.
  leftbar.dispatchEvent(
    new CustomEvent("toolbar:sync-colors", {
      detail: { colors: design.colors },
      bubbles: false,
    }),
  );
});

root.addEventListener("toolbar:symbol", (e) => {
  const { symbolId } = (e as CustomEvent<{ symbolId: string }>).detail;
  const ov: Overlay = {
    id: uid(),
    type: "symbol",
    symbolId,
    x: 50, y: 50, w: 20, h: 20,
    rotation: 0,
    fill: "#FFFFFF",
    stroke: "#0000",
    strokeWidth: 0,
    opacity: 1,
  };
  design.overlays.push(ov);
  redraw();
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

// ── Portrait-mode overlay ──
const portraitOverlay = document.createElement("div");
portraitOverlay.className = "portrait-overlay";
portraitOverlay.setAttribute("aria-live", "polite");
const portraitMsg = document.createElement("p");
portraitMsg.textContent = "Please rotate your device to landscape orientation.";
portraitOverlay.appendChild(portraitMsg);
document.body.appendChild(portraitOverlay);


