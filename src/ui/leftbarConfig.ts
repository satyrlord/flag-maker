import type { TemplateCfg } from "../templates";
import { UI_OVERLAY_TYPE_IDS } from "../types";

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
  stripes: {
    defaultCount: number;
    minCount: number;
    maxCount: number;
    defaultColors: string[];
  };
  overlayTypes: Array<{
    id: string;
    label: string;
  }>;
  templates: Array<{
    id: string;
    name: string;
    group: string;
  }>;
  templateGroups: string[];
}

export function validateLeftbarConfig(
  cfg: LeftbarConfig,
  templateFactories: Record<string, () => TemplateCfg>,
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
  const invalidOverlayIds = cfg.overlayTypes
    .map((type) => type.id)
    .filter((id) => !UI_OVERLAY_TYPE_IDS.has(id));
  if (invalidOverlayIds.length > 0) {
    throw new Error(`leftbar-config: unknown overlay type IDs: ${invalidOverlayIds.join(", ")}`);
  }

  const templateGroups = new Set(cfg.templateGroups);
  if (templateGroups.size !== cfg.templateGroups.length) {
    throw new Error("leftbar-config: templateGroups must be unique");
  }

  const missingFactories = cfg.templates
    .map((template) => template.id)
    .filter((id) => !templateFactories[id]);
  if (missingFactories.length > 0) {
    throw new Error(`leftbar-config: missing template factories for: ${missingFactories.join(", ")}`);
  }

  const undeclaredGroups = cfg.templates
    .map((template) => template.group)
    .filter((group) => !templateGroups.has(group));
  if (undeclaredGroups.length > 0) {
    throw new Error(`leftbar-config: template groups missing from templateGroups: ${[...new Set(undeclaredGroups)].join(", ")}`);
  }

  for (const group of cfg.templateGroups) {
    if (!cfg.templates.some((template) => template.group === group)) {
      throw new Error(`leftbar-config: template group "${group}" has no templates`);
    }
  }
}