import { describe, expect, it } from "vitest";
import {
  TEMPLATE_PREVIEW_MANIFEST,
  validateTemplatePreviewManifest,
  type TemplatePreviewManifest,
} from "@/templatePreviewManifest";

describe("templatePreviewManifest", () => {
  it("accepts the generated manifest", () => {
    expect(Object.keys(TEMPLATE_PREVIEW_MANIFEST).length).toBeGreaterThan(0);
    expect(() => validateTemplatePreviewManifest(TEMPLATE_PREVIEW_MANIFEST)).not.toThrow();
  });

  it("contains only jpg preview paths", () => {
    for (const entry of Object.values(TEMPLATE_PREVIEW_MANIFEST)) {
      expect(entry.imagePath).toMatch(/\.jpe?g$/i);
    }
  });

  it("rejects empty template ids", () => {
    const invalidManifest = {
      "": { imagePath: "template-previews/example.jpg" },
    } satisfies TemplatePreviewManifest;

    expect(() => validateTemplatePreviewManifest(invalidManifest)).toThrow(/ids must not be empty/i);
  });

  it("rejects missing or invalid image paths", () => {
    const missingPath = {
      france: { imagePath: "" },
    } satisfies TemplatePreviewManifest;
    const invalidExtension = {
      france: { imagePath: "template-previews/france.png" },
    } satisfies TemplatePreviewManifest;

    expect(() => validateTemplatePreviewManifest(missingPath)).toThrow(/invalid imagePath/i);
    expect(() => validateTemplatePreviewManifest(invalidExtension)).toThrow(/invalid imagePath/i);
  });
});
