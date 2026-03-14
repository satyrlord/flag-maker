import leftbarConfig from "./config/leftbar-config.json";

/** Overlay type IDs that the renderer can draw. Derived from leftbar-config.json. */
export const RENDERABLE_OVERLAY_TYPE_IDS: ReadonlySet<string> = new Set(
  leftbarConfig.supportedOverlayTypes,
);

/** Overlay type IDs that appear in the leftbar "add overlay" UI. */
export const LEFTBAR_OVERLAY_TYPE_IDS: ReadonlySet<string> = new Set(
  leftbarConfig.overlayTypes.map((type) => type.id),
);
