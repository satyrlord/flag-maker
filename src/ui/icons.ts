/* ──────────────────────────────────────────────
   Flag Maker – Shared SVG Icon Helper
   ────────────────────────────────────────────── */

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Wrap SVG path markup in a Lucide-compatible inline icon string. */
export function svg(inner: string, size = 18): string {
  return (
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  );
}
