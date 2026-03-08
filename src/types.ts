/* ──────────────────────────────────────────────
   Flag Maker – Domain Types
   ────────────────────────────────────────────── */

export type Orientation = "horizontal" | "vertical";
export type OverlayType = "rectangle" | "circle" | "star" | "custom" | "symbol";

export interface Overlay {
  id: string;
  type: OverlayType;
  x: number;  // percent 0..100
  y: number;  // percent 0..100
  w: number;  // percent
  h: number;  // percent
  rotation: number; // deg
  fill: string;
  stroke: string;
  strokeWidth: number; // px relative to canvas
  opacity: number; // 0..1
  locked?: boolean;
  path?: string; // for custom & symbol
  symbolId?: string; // for symbol overlays
}

export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  path?: string;
  generator?: "star5";
  svg?: string;
  viewBox?: string;
}

export interface FlagDesign {
  orientation: Orientation;
  ratio: [number, number];
  sections: number;
  weights: number[];
  colors: string[];
  overlays: Overlay[];
}

export interface StripeRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}
