/* ──────────────────────────────────────────────
   Flag Maker – Dynamic Tools (rightbar)
   Floating vertical toolbar at the right edge
   of the screen. Hidden by default; shown when
   context-dependent tools are available.
   ────────────────────────────────────────────── */

/** Show/hide the rightbar. */
export function setRightbarVisible(
  bar: HTMLElement,
  visible: boolean,
): void {
  bar.classList.toggle("rightbar-visible", visible);
}

export function createRightbar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "rightbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Dynamic Tools");

  // Placeholder: the bar ships empty and invisible.
  // Future tools (alignment, flip, duplicate, eyedropper)
  // will be appended here and setRightbarVisible() called
  // when an overlay is selected or a mode is activated.

  // Example structure preserved for documentation:
  // const btn = document.createElement("button");
  // btn.type = "button";
  // btn.className = "rightbar-btn";
  // btn.innerHTML = svg('<path d="..."/>');
  // btn.setAttribute("aria-label", "Tool name");
  // bar.appendChild(btn);

  return bar;
}
