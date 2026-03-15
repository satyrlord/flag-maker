/* ──────────────────────────────────────────────
   Flag Maker – Domain Types
   ────────────────────────────────────────────── */

import leftbarConfig from "./config/leftbar-config.json";

export type Orientation = "horizontal" | "vertical";
export type OverlayType = "rectangle" | "circle" | "custom" | "symbol" | "starfield";

/* ── Layer Groups ── */

/**
 * The four layer groups that compose a flag, ordered by Z-index
 * (lowest first): stripes (background), overlays (shapes), starfields, symbols (top).
 */
export type LayerGroupId = "stripes" | "overlays" | "starfields" | "symbols";

export interface LayerGroupConstraints {
  minLayers: number;
  maxLayers: number;
}

export const LAYER_GROUP_CONSTRAINTS: Record<LayerGroupId, LayerGroupConstraints> =
  leftbarConfig.layerGroups as Record<LayerGroupId, LayerGroupConstraints>;

/** Determine which layer group an overlay belongs to based on its type. */
export function overlayLayerGroup(ov: Overlay): "overlays" | "starfields" | "symbols" {
  if (ov.type === "starfield") return "starfields";
  return ov.type === "symbol" ? "symbols" : "overlays";
}

/* ── Overlay ── */

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
  visible?: boolean; // default true
  path?: string; // for custom & symbol
  symbolId?: string; // for symbol overlays
  // Starfield-specific properties
  starCount?: number;
  starPoints?: number;
  starPointLength?: number;
  starSize?: number;
  starDistribution?: string;
  starRotateWithPosition?: boolean;
  starCols?: number;
}

export interface SymbolDef {
  id: string;
  name: string;
  category: string;
  path?: string;
  fillRule?: "evenodd" | "nonzero";
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

/**
 * Extract deduplicated symbol IDs referenced by an overlay array.
 * Filters out non-symbol overlays and overlays with missing/empty symbolId.
 */
export function collectSymbolIds(overlays: Overlay[]): string[] {
  return [
    ...new Set(
      overlays
        .filter((overlay): overlay is Overlay & { type: "symbol"; symbolId: string } => (
          overlay.type === "symbol" && typeof overlay.symbolId === "string" && overlay.symbolId.length > 0
        ))
        .map((overlay) => overlay.symbolId),
    ),
  ];
}
