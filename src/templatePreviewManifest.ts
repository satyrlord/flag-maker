import previewManifestJson from "./config/template-preview-manifest.generated.json";

export interface TemplatePreviewManifestEntry {
  imagePath: string;
}

export type TemplatePreviewManifest = Record<string, TemplatePreviewManifestEntry>;

export function validateTemplatePreviewManifest(manifest: TemplatePreviewManifest): void {
  for (const [id, entry] of Object.entries(manifest)) {
    if (!id) {
      throw new Error("template preview manifest: ids must not be empty");
    }
    if (!entry.imagePath || !/\.jpe?g$/i.test(entry.imagePath)) {
      throw new Error(`template preview manifest: invalid imagePath for "${id}"`);
    }
  }
}

validateTemplatePreviewManifest(previewManifestJson);

export const TEMPLATE_PREVIEW_MANIFEST: TemplatePreviewManifest = previewManifestJson;