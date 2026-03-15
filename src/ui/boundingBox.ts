/* ──────────────────────────────────────────────
   Bounding Box — Selection + Transform Handles
   ────────────────────────────────────────────── */

/**
 * Renders a bounding box with 10 handles over a selected overlay:
 *   4 corner handles  — aspect-locked resize
 *   4 side handles    — horizontal or vertical stretch
 *   1 center handle   — move
 *   1 rotation handle — ring around center
 *
 * The bounding box is an HTML overlay positioned on top of the flag
 * SVG so it does not affect exports.
 */

export type HandleId =
  | "nw" | "ne" | "sw" | "se"   // corners
  | "n" | "s" | "e" | "w"      // sides
  | "move"                       // center
  | "rotate";                    // rotation ring

export interface BoundingBoxRect {
  /** Left edge in CSS px relative to the container. */
  left: number;
  /** Top edge in CSS px relative to the container. */
  top: number;
  /** Width in CSS px. */
  width: number;
  /** Height in CSS px. */
  height: number;
  /** Rotation in degrees. */
  rotation: number;
}

/** Drag handle square side length in pixels. */
const HANDLE_SIZE = 8;
/** Distance from the selection frame edge to the rotation ring, in pixels.
 *  Set to 2x the handle size so the ring clears the corner handles. */
const ROTATION_RING_OFFSET = 16;
/** CSS color for the selection frame border and rotation connector line. */
const BORDER_COLOR = "var(--color-primary)";
/** CSS color for the interior fill of resize and move handles. */
const HANDLE_FILL = "var(--color-primary-content)";
/** CSS color for the border stroke of resize and move handles. */
const HANDLE_STROKE = "var(--color-primary)";
/** Rotation ring handle diameter in pixels; slightly larger than HANDLE_SIZE
 *  so it is visually distinct from the resize handles. */
const ROTATION_RING_SIZE = 10;

/**
 * Creates the bounding box container element. Call once; reuse it.
 */
export function createBoundingBoxContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "bb-container";
  container.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  `;
  return container;
}

/**
 * Build handle elements and attach them to the frame, returning a map
 * from handle id to element so callers can attach pointer listeners.
 */
function createHandles(frame: HTMLDivElement): Map<HandleId, HTMLDivElement> {
  const handles = new Map<HandleId, HTMLDivElement>();

  const makeHandle = (
    id: HandleId,
    cursor: string,
    extraCss: string,
  ): HTMLDivElement => {
    const h = document.createElement("div");
    h.dataset.handleId = id;
    h.style.cssText = `
      position: absolute;
      pointer-events: auto;
      box-sizing: border-box;
      background: ${HANDLE_FILL};
      border: 1.5px solid ${HANDLE_STROKE};
      z-index: 2;
      cursor: ${cursor};
      ${extraCss}
    `;
    handles.set(id, h);
    frame.appendChild(h);
    return h;
  };

  // Corner handles
  const hs = HANDLE_SIZE;
  const cornerBase = `width: ${hs}px; height: ${hs}px; border-radius: 1px;`;
  makeHandle("nw", "nwse-resize", `${cornerBase} top: ${-hs / 2}px; left: ${-hs / 2}px;`);
  makeHandle("ne", "nesw-resize", `${cornerBase} top: ${-hs / 2}px; right: ${-hs / 2}px;`);
  makeHandle("sw", "nesw-resize", `${cornerBase} bottom: ${-hs / 2}px; left: ${-hs / 2}px;`);
  makeHandle("se", "nwse-resize", `${cornerBase} bottom: ${-hs / 2}px; right: ${-hs / 2}px;`);

  // Side handles
  const sideW = hs;
  const sideH = hs;
  makeHandle("n", "ns-resize",
    `width: ${sideW}px; height: ${sideH}px; border-radius: 1px;
     top: ${-sideH / 2}px; left: 50%; transform: translateX(-50%);`);
  makeHandle("s", "ns-resize",
    `width: ${sideW}px; height: ${sideH}px; border-radius: 1px;
     bottom: ${-sideH / 2}px; left: 50%; transform: translateX(-50%);`);
  makeHandle("e", "ew-resize",
    `width: ${sideW}px; height: ${sideH}px; border-radius: 1px;
     right: ${-sideW / 2}px; top: 50%; transform: translateY(-50%);`);
  makeHandle("w", "ew-resize",
    `width: ${sideW}px; height: ${sideH}px; border-radius: 1px;
     left: ${-sideW / 2}px; top: 50%; transform: translateY(-50%);`);

  // Center move handle
  makeHandle("move", "move",
    `width: ${hs + 2}px; height: ${hs + 2}px; border-radius: 50%;
     top: 50%; left: 50%; transform: translate(-50%, -50%);
     background: ${BORDER_COLOR}; border-color: ${HANDLE_FILL};`);

  // Rotation handle — circular, positioned above the bounding box
  const rs = ROTATION_RING_SIZE;
  makeHandle("rotate", "crosshair",
    `width: ${rs}px; height: ${rs}px; border-radius: 50%;
     top: ${-(ROTATION_RING_OFFSET + rs / 2)}px; left: 50%;
     transform: translateX(-50%);
     background: transparent; border: 2px solid ${BORDER_COLOR};`);

  // Rotation connector line (visual only, not a handle)
  const connector = document.createElement("div");
  connector.style.cssText = `
    position: absolute;
    width: 1px;
    height: ${ROTATION_RING_OFFSET}px;
    background: ${BORDER_COLOR};
    top: ${-ROTATION_RING_OFFSET}px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 1;
  `;
  frame.appendChild(connector);

  return handles;
}

export interface BoundingBox {
  /** Container element (parent of the frame). */
  container: HTMLDivElement;
  /** The rotatable frame element wrapping handles + border. */
  frame: HTMLDivElement;
  /** Map of handle-id to DOM element. */
  handles: Map<HandleId, HTMLDivElement>;
  /** Update position and size to match an overlay rect. */
  update(rect: BoundingBoxRect): void;
  /** Show the bounding box. */
  show(): void;
  /** Hide the bounding box. */
  hide(): void;
}

/**
 * Create a full bounding box widget. Returns the container, frame,
 * handles map, and control methods.
 */
export function createBoundingBox(): BoundingBox {
  const container = createBoundingBoxContainer();

  const frame = document.createElement("div");
  frame.className = "bb-frame";
  frame.style.cssText = `
    position: absolute;
    border: 1.5px solid ${BORDER_COLOR};
    pointer-events: none;
    box-sizing: border-box;
    transform-origin: center center;
  `;
  container.appendChild(frame);

  const handles = createHandles(frame);

  function update(rect: BoundingBoxRect): void {
    frame.style.left = `${rect.left}px`;
    frame.style.top = `${rect.top}px`;
    frame.style.width = `${rect.width}px`;
    frame.style.height = `${rect.height}px`;
    frame.style.transform = rect.rotation
      ? `rotate(${rect.rotation}deg)`
      : "";
  }

  function show(): void {
    container.style.display = "";
  }

  function hide(): void {
    container.style.display = "none";
  }

  hide(); // initially hidden
  return { container, frame, handles, update, show, hide };
}
