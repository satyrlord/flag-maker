/* ──────────────────────────────────────────────
   Flag Maker – Vanilla TS Entry Point
   ────────────────────────────────────────────── */

import "./index.css";
import { createTopbar } from "./ui/topbar";
import { createLeftbar } from "./ui/leftbar";
import { renderFlag } from "./flagRenderer";
import { rectOverlay, circleOverlay, starOverlay } from "./overlays";
import { uid } from "./utils";
import type { FlagDesign, Overlay, Orientation } from "./types";
import type { TemplateCfg } from "./templates";

const root = document.querySelector<HTMLDivElement>("#root")!;
root.className = "app-shell";

// ── Application Settings (topbar) ──
root.appendChild(createTopbar());

// ── Flag Editor (leftbar) ──
root.appendChild(createLeftbar());

// ── Canvas area ──
const canvas = document.createElement("main");
canvas.className = "flag-canvas";
root.appendChild(canvas);

// ── Default flag design ──
const design: FlagDesign = {
  orientation: "horizontal",
  ratio: [2, 3],
  sections: 3,
  weights: [1, 1, 1],
  colors: ["#CE1126", "#FFFFFF", "#002395"],
  overlays: [],
};

// ── Live flag rendering ──
let flagEl: SVGSVGElement | null = null;

function redraw(): void {
  const next = renderFlag(design);
  next.setAttribute("class", "flag-svg");
  if (flagEl && canvas.contains(flagEl)) {
    canvas.replaceChild(next, flagEl);
  } else {
    canvas.appendChild(next);
  }
  flagEl = next;
}

redraw();

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
  root.dispatchEvent(
    new CustomEvent("toolbar:sync-colors", {
      detail: { colors: design.colors },
      bubbles: true,
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

// ── Portrait-mode overlay ──
const portraitOverlay = document.createElement("div");
portraitOverlay.className = "portrait-overlay";
portraitOverlay.setAttribute("aria-live", "polite");
const portraitMsg = document.createElement("p");
portraitMsg.textContent = "Please rotate your device to landscape orientation.";
portraitOverlay.appendChild(portraitMsg);
document.body.appendChild(portraitOverlay);


