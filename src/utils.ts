/* ──────────────────────────────────────────────
   Flag Maker – Pure Utility Functions
   ────────────────────────────────────────────── */

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const uid = (): string => Math.random().toString(36).slice(2, 9);

/** Generate a 5-point (or n-point) star path centered at (cx, cy). */
export function starPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5,
): string {
  let path = "";
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return path + " Z";
}

/** Trigger a browser download of a string blob. */
export function download(
  filename: string,
  data: string,
  type = "image/svg+xml;charset=utf-8",
): void {
  const blob = new Blob([data], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Rasterize an SVG element to a data-URL in the given image format.
 *
 * Common failure scenarios (rejects with an Error):
 * - The serialized SVG markup is malformed or contains unsupported elements
 *   that prevent the browser from decoding the `data:image/svg+xml` URI.
 * - The SVG references external resources blocked by CORS, tainting the canvas.
 * - The browser's image decoder is unavailable (e.g. in a worker context).
 */
export function svgToRaster(
  svgEl: SVGSVGElement,
  mimeType: "image/png" | "image/jpeg",
  scale = 1,
  quality?: number,
): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const image64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load SVG as image"));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.viewBox.baseVal.width * scale;
      canvas.height = svgEl.viewBox.baseVal.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.src = image64;
  });
}

/**
 * Convenience wrapper: rasterize SVG to PNG data-URL.
 *
 * No `quality` parameter is accepted because PNG is a lossless format --
 * the `quality` argument to `canvas.toDataURL("image/png")` is ignored
 * by browsers per the spec.
 */
export function svgToPng(
  svgEl: SVGSVGElement,
  scale = 1,
): Promise<string> {
  return svgToRaster(svgEl, "image/png", scale);
}

/** Download a data-URL as a file. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
