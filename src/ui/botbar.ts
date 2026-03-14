/* ──────────────────────────────────────────────
   Flag Maker – Zoom Level (botbar)
   Floating pill-shaped bar at the bottom center
   of the canvas with zoom-out, level display,
   and zoom-in controls.
   ────────────────────────────────────────────── */

export const ZOOM_MIN = 10;
export const ZOOM_MAX = 100;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export interface BotbarHandle {
  element: HTMLElement;
  setZoom: (value: number) => void;
}

export function createBotbar(): BotbarHandle {
  const bar = document.createElement("div");
  bar.className = "join botbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Zoom Level");

  let zoom = ZOOM_DEFAULT;

  // Zoom out button
  const btnOut = document.createElement("button");
  btnOut.type = "button";
  btnOut.className = "join-item btn btn-ghost btn-circle btn-sm";
  btnOut.textContent = "\u2212";
  btnOut.setAttribute("aria-label", "Zoom out");

  // Zoom level display
  const level = document.createElement("span");
  level.className = "join-item botbar-level";
  level.textContent = `${zoom}%`;

  // Zoom in button
  const btnIn = document.createElement("button");
  btnIn.type = "button";
  btnIn.className = "join-item btn btn-ghost btn-circle btn-sm";
  btnIn.textContent = "+";
  btnIn.setAttribute("aria-label", "Zoom in");

  function emitZoom(): void {
    bar.dispatchEvent(
      new CustomEvent("botbar:zoom", {
        detail: { zoom },
        bubbles: true,
      }),
    );
  }

  function update(): void {
    level.textContent = `${zoom}%`;
    btnOut.disabled = zoom <= ZOOM_MIN;
    btnIn.disabled = zoom >= ZOOM_MAX;
  }

  btnOut.addEventListener("click", () => {
    zoom = Math.max(ZOOM_MIN, zoom - ZOOM_STEP);
    update();
    emitZoom();
  });

  btnIn.addEventListener("click", () => {
    zoom = Math.min(ZOOM_MAX, zoom + ZOOM_STEP);
    update();
    emitZoom();
  });

  /** Update display without emitting an event (used by external wheel handler). */
  function setZoom(value: number): void {
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
    update();
  }

  update();
  bar.append(btnOut, level, btnIn);
  return { element: bar, setZoom };
}
