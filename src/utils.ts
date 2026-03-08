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

/** Rasterize an SVG element to a PNG data-URL. */
export function svgToPng(
  svgEl: SVGSVGElement,
  scale = 1,
): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const image64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.viewBox.baseVal.width * scale;
      canvas.height = svgEl.viewBox.baseVal.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = image64;
  });
}
