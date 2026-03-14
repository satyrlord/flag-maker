import { RENDERABLE_OVERLAY_TYPE_IDS } from "../overlayTypeConfig";
import { parseRatio } from "../ratio";

export interface LeftbarConfig {
  ratios: Array<{
    label: string;
    ratio: number[];
    // Approximate number of sovereign states using this aspect ratio as their
    // national flag, used to sort ratios by real-world commonality. Source:
    // https://en.wikipedia.org/wiki/List_of_aspect_ratios_of_national_flags
    // (rounded to nearest whole number). Values are manually curated and may
    // drift from the source over time.
    commonality: number;
  }>;
  defaultRatio: string;
  defaultOrientation: string;
  defaultOverlayFill: string;
  layerGroupOrder: string[];
  supportedOverlayTypes: string[];
  stripes: {
    defaultCount: number;
    minCount: number;
    maxCount: number;
    defaultColors: string[];
  };
  overlayTypes: Array<{
    id: string;
    label: string;
    shortLabel: string;
  }>;
  templateGroups: string[];
  layerGroups: Record<string, {
    minLayers: number;
    maxLayers: number;
  }>;
  starfield: {
    distributions: Array<{ id: string; label: string }>;
    defaultDistribution: string;
    defaultStarCount: number;
    defaultStarPoints: number;
    defaultStarPointLength: number;
    defaultStarSize: number;
    defaultFill: string;
    minStarCount: number;
    maxStarCount: number;
    minStarPoints: number;
    maxStarPoints: number;
  };
}

export function validateLeftbarConfig(
  cfg: LeftbarConfig,
): void {
  if (cfg.ratios.length === 0) {
    throw new Error("leftbar-config: ratios must not be empty");
  }

  const ratioLabels = new Set(cfg.ratios.map((ratio) => ratio.label));
  if (ratioLabels.size !== cfg.ratios.length) {
    throw new Error("leftbar-config: ratio labels must be unique");
  }
  if (!ratioLabels.has(cfg.defaultRatio)) {
    throw new Error(`leftbar-config: defaultRatio "${cfg.defaultRatio}" is not defined`);
  }

  try {
    parseRatio(cfg.defaultRatio);
  } catch {
    throw new Error(`leftbar-config: defaultRatio "${cfg.defaultRatio}" must be "N:M" with positive numbers`);
  }

  for (const ratio of cfg.ratios) {
    if (ratio.ratio.length !== 2) {
      throw new Error(`leftbar-config: ratio "${ratio.label}" must contain exactly two values`);
    }
    if (ratio.ratio[0] <= 0 || ratio.ratio[1] <= 0) {
      throw new Error(`leftbar-config: ratio "${ratio.label}" must be positive`);
    }
  }

  if (cfg.stripes.minCount > cfg.stripes.defaultCount || cfg.stripes.defaultCount > cfg.stripes.maxCount) {
    throw new Error("leftbar-config: stripes.defaultCount must be within minCount/maxCount");
  }
  if (cfg.stripes.defaultColors.length < cfg.stripes.maxCount) {
    throw new Error("leftbar-config: stripes.defaultColors must cover maxCount");
  }

  const overlayIds = new Set(cfg.overlayTypes.map((type) => type.id));
  if (overlayIds.size !== cfg.overlayTypes.length) {
    throw new Error("leftbar-config: overlay type IDs must be unique");
  }

  if (!Array.isArray(cfg.supportedOverlayTypes) || cfg.supportedOverlayTypes.length === 0) {
    throw new Error("leftbar-config: supportedOverlayTypes must not be empty");
  }

  const supportedOverlayTypes = new Set(cfg.supportedOverlayTypes);
  if (supportedOverlayTypes.size !== cfg.supportedOverlayTypes.length) {
    throw new Error("leftbar-config: supportedOverlayTypes must be unique");
  }

  const missingRenderableTypes = [...RENDERABLE_OVERLAY_TYPE_IDS]
    .filter((id) => !supportedOverlayTypes.has(id));
  if (missingRenderableTypes.length > 0) {
    throw new Error(
      `leftbar-config: supportedOverlayTypes must include ${missingRenderableTypes.join(", ")}`,
    );
  }

  const unsupportedTypes = cfg.overlayTypes
    .map((t) => t.id)
    .filter((id) => !supportedOverlayTypes.has(id));
  if (unsupportedTypes.length > 0) {
    throw new Error(
      `leftbar-config: unsupported overlay types: ${unsupportedTypes.join(", ")}. ` +
      `Supported: ${[...supportedOverlayTypes].join(", ")}`,
    );
  }

  const templateGroups = new Set(cfg.templateGroups);
  if (templateGroups.size !== cfg.templateGroups.length) {
    throw new Error("leftbar-config: templateGroups must be unique");
  }

  const requiredGroups = ["stripes", "overlays", "starfields", "symbols"];
  for (const gid of requiredGroups) {
    const lg = cfg.layerGroups[gid];
    if (!lg) {
      throw new Error(`leftbar-config: layerGroups must include "${gid}"`);
    }
    if (lg.minLayers < 0 || lg.maxLayers < lg.minLayers) {
      throw new Error(`leftbar-config: layerGroups.${gid} has invalid min/max`);
    }
  }

  const validOrientations = ["horizontal", "vertical"];
  if (!validOrientations.includes(cfg.defaultOrientation)) {
    throw new Error(`leftbar-config: defaultOrientation "${cfg.defaultOrientation}" must be "horizontal" or "vertical"`);
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(cfg.defaultOverlayFill)) {
    throw new Error(`leftbar-config: defaultOverlayFill "${cfg.defaultOverlayFill}" must be a 6-digit hex color`);
  }

  const requiredGroupOrder = ["stripes", "overlays", "starfields", "symbols"];
  if (
    cfg.layerGroupOrder.length !== requiredGroupOrder.length ||
    !requiredGroupOrder.every((g) => cfg.layerGroupOrder.includes(g))
  ) {
    throw new Error(
      `leftbar-config: layerGroupOrder must contain exactly ${requiredGroupOrder.join(", ")}`,
    );
  }
}
