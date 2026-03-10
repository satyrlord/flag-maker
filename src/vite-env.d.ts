/// <reference types="vite/client" />

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

declare module "@/config/grid-config.json" {
  const value: import("./ui/gridConfig").GridConfig;
  export default value;
}

declare module "@/config/export-sizes.json" {
  const value: import("./ui/exportSizesConfig").ExportSizesConfig;
  export default value;
}
