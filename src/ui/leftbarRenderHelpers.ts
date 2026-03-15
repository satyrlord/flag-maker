import type { SymbolDef } from "../types";
import { getLoadedBuiltinSymbols } from "../symbols";
import { starPath } from "../utils";
import type { TemplateCfg } from "../templates";

const NS = "http://www.w3.org/2000/svg";

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function sectionTitle(text: string): HTMLElement {
  return h("h3", "toolbar-section-title text-secondary", text);
}

export function panelHeader(text: string, iconMarkup?: string): HTMLElement {
  const row = h("div", "toolbar-panel-header");
  const title = sectionTitle(text);
  title.style.margin = "0";
  row.appendChild(title);
  if (iconMarkup) {
    const span = h("span", "toolbar-panel-icon");
    span.innerHTML = iconMarkup;
    row.appendChild(span);
  }
  return row;
}

export function templateThumbnail(
  cfg: TemplateCfg,
  thumbH = 28,
  symbols: SymbolDef[] = getLoadedBuiltinSymbols(),
): SVGSVGElement {
  const [rh, rw] = cfg.ratio;
  const aspect = rw / rh;
  const thumbW = Math.round(thumbH * aspect);

  const svgElement = document.createElementNS(NS, "svg");
  svgElement.setAttribute("viewBox", `0 0 ${thumbW} ${thumbH}`);
  svgElement.setAttribute("width", String(thumbW));
  svgElement.setAttribute("height", String(thumbH));
  svgElement.style.borderRadius = "2px";
  svgElement.style.border = "1px solid oklch(var(--b3))";
  svgElement.style.flexShrink = "0";

  const stripeCount = cfg.sections;
  const weights = cfg.weights ?? Array.from<number>({ length: stripeCount }).fill(1);
  const totalWeight = weights.reduce((accumulator, weight) => accumulator + weight, 0);
  let offset = 0;
  for (let index = 0; index < stripeCount; index++) {
    const fraction = weights[index] / totalWeight;
    const rect = document.createElementNS(NS, "rect");
    if (cfg.orientation === "vertical") {
      rect.setAttribute("x", String(Math.round(offset * thumbW)));
      rect.setAttribute("y", "0");
      rect.setAttribute("width", String(Math.ceil(fraction * thumbW)));
      rect.setAttribute("height", String(thumbH));
    } else {
      rect.setAttribute("x", "0");
      rect.setAttribute("y", String(Math.round(offset * thumbH)));
      rect.setAttribute("width", String(thumbW));
      rect.setAttribute("height", String(Math.ceil(fraction * thumbH)));
    }
    rect.setAttribute("fill", cfg.colors[index] ?? "#ccc");
    svgElement.appendChild(rect);
    offset += fraction;
  }

  for (const overlay of cfg.overlays) {
    if (overlay.type === "rectangle") {
      const rect = document.createElementNS(NS, "rect");
      const rectX = ((overlay.x - overlay.w / 2) / 100) * thumbW;
      const rectY = ((overlay.y - overlay.h / 2) / 100) * thumbH;
      const rectWidth = (overlay.w / 100) * thumbW;
      const rectHeight = (overlay.h / 100) * thumbH;
      rect.setAttribute("x", String(rectX));
      rect.setAttribute("y", String(rectY));
      rect.setAttribute("width", String(rectWidth));
      rect.setAttribute("height", String(rectHeight));
      rect.setAttribute("fill", overlay.fill);
      if (overlay.rotation) {
        const centerX = rectX + rectWidth / 2;
        const centerY = rectY + rectHeight / 2;
        rect.setAttribute("transform", `rotate(${overlay.rotation} ${centerX} ${centerY})`);
      }
      svgElement.appendChild(rect);
    } else if (overlay.type === "custom" && overlay.path) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", overlay.path);
      path.setAttribute("fill", overlay.fill);
      path.setAttribute("transform", `scale(${thumbW / 100} ${thumbH / 100})`);
      svgElement.appendChild(path);
    } else if (overlay.type === "symbol" && overlay.symbolId) {
      const symbol = symbols.find((candidate) => candidate.id === overlay.symbolId);
      if (!symbol) {
        continue;
      }
      const nested = document.createElementNS(NS, "svg");
      const originX = ((overlay.x - overlay.w / 2) / 100) * thumbW;
      const originY = ((overlay.y - overlay.h / 2) / 100) * thumbH;
      const width = (overlay.w / 100) * thumbW;
      const height = (overlay.h / 100) * thumbH;
      nested.setAttribute("x", String(originX));
      nested.setAttribute("y", String(originY));
      nested.setAttribute("width", String(width));
      nested.setAttribute("height", String(height));
      nested.setAttribute("viewBox", symbol.viewBox ?? "0 0 100 100");
      nested.setAttribute("preserveAspectRatio", "xMidYMid meet");
      nested.setAttribute("overflow", "visible");
      if (symbol.svg) {
        nested.style.color = overlay.fill;
        nested.innerHTML = symbol.svg;
      } else if (symbol.path) {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", symbol.path);
        path.setAttribute("fill", overlay.fill);
        if (symbol.fillRule) path.setAttribute("fill-rule", symbol.fillRule);
        nested.appendChild(path);
      } else if (symbol.generator === "star5") {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", starPath(50, 50, 40, 16));
        path.setAttribute("fill", overlay.fill);
        nested.appendChild(path);
      }
      if (overlay.rotation) {
        const centerX = originX + width / 2;
        const centerY = originY + height / 2;
        nested.setAttribute("transform", `rotate(${overlay.rotation} ${centerX} ${centerY})`);
      }
      svgElement.appendChild(nested);
    }
  }

  return svgElement;
}

export function templateStaticPreview(
  entry: { name: string; previewImagePath?: string },
  cfg: TemplateCfg,
  thumbH = 28,
): HTMLImageElement {
  const [rh, rw] = cfg.ratio;
  const aspect = rw / rh;
  const thumbW = Math.round(thumbH * aspect);
  const image = h("img", "toolbar-template-thumb") as HTMLImageElement;
  if (!entry.previewImagePath) {
    throw new Error(`template preview: missing image path for "${entry.name}"`);
  }
  image.src = `${import.meta.env.BASE_URL}${entry.previewImagePath}`;
  image.alt = "";
  image.width = thumbW;
  image.height = thumbH;
  image.decoding = "async";
  image.loading = "lazy";
  image.setAttribute("aria-hidden", "true");
  image.style.width = `${thumbW}px`;
  image.style.height = `${thumbH}px`;
  image.style.borderRadius = "2px";
  image.style.border = "1px solid oklch(var(--b3))";
  image.style.flexShrink = "0";
  return image;
}

export function symbolPreview(sym: SymbolDef): SVGSVGElement {
  const svgElement = document.createElementNS(NS, "svg");
  svgElement.setAttribute("viewBox", sym.viewBox ?? "0 0 100 100");
  svgElement.style.color = "oklch(var(--bc))";

  if (sym.svg) {
    svgElement.innerHTML = sym.svg;
  } else if (sym.path) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", sym.path);
    path.setAttribute("fill", "currentColor");
    if (sym.fillRule) path.setAttribute("fill-rule", sym.fillRule);
    svgElement.appendChild(path);
  } else if (sym.generator === "star5") {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", starPath(50, 50, 40, 16));
    path.setAttribute("fill", "currentColor");
    svgElement.appendChild(path);
  }

  return svgElement;
}