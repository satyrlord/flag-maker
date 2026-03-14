import divisionConfig from "./config/template-division-config.json";
import nationalConfig from "./config/national-division-config.json";
import substateConfig from "./config/substate-division-config.json";
import { TEMPLATE_PREVIEW_MANIFEST } from "./templatePreviewManifest";
import {
  type TemplateCfg,
  templatePerPale,
  templatePerFess,
  templateTricolorVertical,
  templateTricolorHorizontal,
  templateQuartered,
  templatePerBend,
  templatePerBendSinister,
  templatePerSaltire,
  templateCenteredCross,
  templateNordicCross,
  nationalFlagTemplate,
  NATIONAL_FLAG_CONFIGS,
  stateLevelFlagTemplate,
} from "./templates";

export interface TemplateCatalogConfigEntry {
  id: string;
  name: string;
}

export interface NationalTemplateCatalogConfigEntry {
  id: string;
}

export interface TemplateCatalogEntry extends TemplateCatalogConfigEntry {
  group: string;
  create: () => TemplateCfg;
  previewImagePath?: string;
}

export interface TemplateCatalogGroup {
  group: string;
  entries: TemplateCatalogConfigEntry[];
}

const DIVISION_FACTORIES: Record<string, () => TemplateCfg> = {
  perPale: templatePerPale,
  perFess: templatePerFess,
  triV: templateTricolorVertical,
  triH: templateTricolorHorizontal,
  quartered: templateQuartered,
  perBend: templatePerBend,
  perBendSin: templatePerBendSinister,
  saltire: templatePerSaltire,
  centCross: templateCenteredCross,
  nordic: templateNordicCross,
};

const NATIONAL_NAME_MAP = new Map(NATIONAL_FLAG_CONFIGS.map((entry) => [entry.id, entry.name]));

export function resolveNationalTemplateEntries(
  entries: NationalTemplateCatalogConfigEntry[],
  nationalNameMap: ReadonlyMap<string, string> = NATIONAL_NAME_MAP,
): TemplateCatalogConfigEntry[] {
  return entries.map(({ id }) => {
    const name = nationalNameMap.get(id);
    if (!name) {
      throw new Error(`national-division-config: unknown national template id "${id}"`);
    }
    return { id, name };
  });
}

export const TEMPLATE_GROUPED_CONFIGS: TemplateCatalogGroup[] = [
  { group: "Division", entries: divisionConfig },
  { group: "National", entries: resolveNationalTemplateEntries(nationalConfig) },
  { group: "State Level", entries: substateConfig },
];

export function getTemplateFactory(id: string): (() => TemplateCfg) | undefined {
  if (id in DIVISION_FACTORIES) {
    return DIVISION_FACTORIES[id];
  }
  return nationalFlagTemplate(id) ?? stateLevelFlagTemplate(id) ?? undefined;
}

export function validateTemplateCatalog(
  templateGroups: string[],
  groupedConfigs: TemplateCatalogGroup[],
  templateFactories: Record<string, () => TemplateCfg>,
): void {
  const groupedNames = new Set(groupedConfigs.map((group) => group.group));
  const duplicateGroups = groupedConfigs
    .map((group) => group.group)
    .filter((group, index, all) => all.indexOf(group) !== index);
  if (duplicateGroups.length > 0) {
    throw new Error(`template catalog: duplicate groups: ${[...new Set(duplicateGroups)].join(", ")}`);
  }

  const undeclaredGroups = groupedConfigs
    .map((group) => group.group)
    .filter((group) => !templateGroups.includes(group));
  if (undeclaredGroups.length > 0) {
    throw new Error(`template catalog: template groups missing from templateGroups: ${[...new Set(undeclaredGroups)].join(", ")}`);
  }

  for (const group of templateGroups) {
    if (!groupedNames.has(group)) {
      throw new Error(`template catalog: template group "${group}" has no templates`);
    }
  }

  const seenIds = new Set<string>();
  for (const group of groupedConfigs) {
    if (group.entries.length === 0) {
      throw new Error(`template catalog: template group "${group.group}" has no templates`);
    }
    for (const entry of group.entries) {
      if (seenIds.has(entry.id)) {
        throw new Error(`template catalog: duplicate template id "${entry.id}"`);
      }
      seenIds.add(entry.id);
      if (!templateFactories[entry.id]) {
        throw new Error(`template catalog: missing template factories for: ${entry.id}`);
      }
    }
  }
}

export function buildTemplateCatalog(groupedConfigs: TemplateCatalogGroup[]): TemplateCatalogEntry[] {
  return groupedConfigs.flatMap((group) =>
    group.entries.map((entry) => {
      const create = getTemplateFactory(entry.id);
      if (!create) {
        throw new Error(`template catalog: missing factory for template "${entry.id}"`);
      }
      return {
        ...entry,
        group: group.group,
        create,
        previewImagePath: TEMPLATE_PREVIEW_MANIFEST[entry.id]?.imagePath,
      };
    }),
  );
}

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = buildTemplateCatalog(TEMPLATE_GROUPED_CONFIGS);

export const ALL_TEMPLATE_FACTORIES: Record<string, () => TemplateCfg> = Object.fromEntries(
  TEMPLATE_CATALOG.map((entry) => [entry.id, entry.create]),
);