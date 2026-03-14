/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*?url" {
  const value: string;
  export default value;
}

/**
 * Injected by Vite `define` as the total git commit count at build time.
 *
 * @remarks
 * This constant is only substituted when building or serving through Vite.
 * When compiling with plain `tsc` or other non-Vite tooling, `__COMMIT_COUNT__`
 * is not replaced and will be `undefined` at runtime. All usages include a
 * `?? 0` fallback to handle that case safely.
 */
declare const __COMMIT_COUNT__: number;

declare module "@/config/leftbar-config.json" {
  const value: import("./ui/leftbarConfig").LeftbarConfig;
  export default value;
}

declare module "@/config/template-division-config.json" {
  const value: import("./templateCatalog").TemplateCatalogConfigEntry[];
  export default value;
}

declare module "@/config/national-division-config.json" {
  const value: import("./templateCatalog").NationalTemplateCatalogConfigEntry[];
  export default value;
}

declare module "@/config/substate-division-config.json" {
  const value: import("./templateCatalog").TemplateCatalogConfigEntry[];
  export default value;
}

declare module "@/config/grid-config.json" {
  const value: import("./ui/gridConfig").GridConfig;
  export default value;
}

declare module "@/config/symbols-config.json" {
  const value: {
    metadataFiles: string[];
    svgDirectory: string;
    outputFile: string;
  };
  export default value;
}

declare module "@/config/symbols-catalog.generated.json" {
  const value: import("./symbols").GeneratedSymbolCatalogFile;
  export default value;
}

declare module "@/config/export-sizes.json" {
  const value: import("./ui/exportSizesConfig").ExportSizesConfig;
  export default value;
}

declare module "@/config/template-preview-manifest.generated.json" {
  const value: import("./templatePreviewManifest").TemplatePreviewManifest;
  export default value;
}
