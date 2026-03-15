import { describe, expect, it } from "vitest";

import {
  panelHeader,
  sectionTitle,
  symbolPreview,
  templateStaticPreview,
  templateThumbnail,
} from "@/ui/leftbarRenderHelpers";
import type { SymbolDef } from "@/types";
import type { TemplateCfg } from "@/templates";

describe("leftbarRenderHelpers", () => {
  it("renders a section title and optional panel icon markup", () => {
    const title = sectionTitle("Symbols");
    expect(title.tagName).toBe("H3");
    expect(title.textContent).toBe("Symbols");

    const header = panelHeader("Templates", "<svg><circle cx='5' cy='5' r='5'/></svg>");
    expect(header.querySelector(".toolbar-section-title")?.textContent).toBe("Templates");
    expect(header.querySelector(".toolbar-panel-icon svg")).toBeTruthy();

    const plainHeader = panelHeader("Saved");
    expect(plainHeader.querySelector(".toolbar-panel-icon")).toBeNull();
  });

  it("renders template thumbnails for rectangle, custom, path, generator, and svg symbols", () => {
    const symbols: SymbolDef[] = [
      {
        id: "svg-symbol",
        name: "SVG",
        category: "Test",
        viewBox: "0 0 100 100",
        svg: "<circle cx='50' cy='50' r='40' fill='currentColor' />",
      },
      {
        id: "path-symbol",
        name: "Path",
        category: "Test",
        viewBox: "0 0 100 100",
        path: "M10 10 L90 10 L50 90 Z",
        fillRule: "evenodd",
      },
      { id: "gen-symbol", name: "Generated", category: "Test", generator: "star5" },
    ];
    const cfg: TemplateCfg = {
      ratio: [2, 3],
      orientation: "horizontal",
      sections: 2,
      colors: ["#111111", "#eeeeee"],
      overlays: [
        { type: "rectangle", x: 50, y: 50, w: 30, h: 20, rotation: 20, fill: "#ff0000" },
        { type: "custom", path: "M10 10 L90 10 L50 90 Z", fill: "#00ff00" },
        { type: "symbol", symbolId: "svg-symbol", x: 20, y: 20, w: 15, h: 15, rotation: 15, fill: "#ffffff" },
        { type: "symbol", symbolId: "path-symbol", x: 50, y: 50, w: 15, h: 15, rotation: 25, fill: "#ffffff" },
        { type: "symbol", symbolId: "gen-symbol", x: 80, y: 80, w: 15, h: 15, fill: "#ffffff" },
        { type: "symbol", symbolId: "missing-symbol", x: 40, y: 80, w: 15, h: 15, fill: "#ffffff" },
      ],
    } as TemplateCfg;

    const thumbnail = templateThumbnail(cfg, 28, symbols);
    const svgSymbolWrapper = thumbnail.querySelector("circle")?.closest("svg") as SVGSVGElement | null;
    const pathSymbol = thumbnail.querySelector("path[d='M10 10 L90 10 L50 90 Z'][fill='#ffffff']");

    expect(thumbnail.querySelector("rect[transform]")).toBeTruthy();
    expect(pathSymbol).toBeTruthy();
    expect(pathSymbol?.getAttribute("fill-rule")).toBe("evenodd");
    expect(thumbnail.querySelectorAll("svg")).toHaveLength(3);
    expect(thumbnail.innerHTML).toContain("circle");
    expect(svgSymbolWrapper?.style.color).toBe("rgb(255, 255, 255)");
    expect(thumbnail.querySelector("svg[transform^='rotate(15']")).toBeTruthy();
    expect(thumbnail.querySelector("svg[transform^='rotate(25']")).toBeTruthy();
  });

  it("renders vertical template thumbnails and falls back missing stripe colors to #ccc", () => {
    const cfg: TemplateCfg = {
      ratio: [1, 2],
      orientation: "vertical",
      sections: 2,
      colors: ["#123456"],
      overlays: [],
    } as unknown as TemplateCfg;

    const thumbnail = templateThumbnail(cfg, 28, []);
    const rects = thumbnail.querySelectorAll("rect");

    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute("x")).toBe("0");
    expect(rects[1].getAttribute("fill")).toBe("#ccc");
  });

  it("builds static preview images and rejects missing preview paths", () => {
    const cfg: TemplateCfg = {
      ratio: [2, 3],
      orientation: "horizontal",
      sections: 2,
      colors: ["#111111", "#eeeeee"],
      overlays: [],
    } as TemplateCfg;

    const image = templateStaticPreview({ name: "France", previewImagePath: "template-previews/france.jpg" }, cfg, 30);
    expect(image.tagName).toBe("IMG");
    expect(image.src).toContain("template-previews/france.jpg");
    expect(image.width).toBe(45);
    expect(() => templateStaticPreview({ name: "Broken" }, cfg)).toThrow('template preview: missing image path for "Broken"');
  });

  it("renders symbol previews for svg, path, and generated symbols", () => {
    const svgPreview = symbolPreview({ id: "svg", name: "SVG", category: "Test", svg: "<rect width='100' height='100' />" });
    expect(svgPreview.innerHTML).toContain("rect");

    const pathPreview = symbolPreview({
      id: "path",
      name: "Path",
      category: "Test",
      path: "M10 10 L90 10 L50 90 Z",
      fillRule: "evenodd",
    });
    expect(pathPreview.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
    expect(pathPreview.querySelector("path")?.getAttribute("fill-rule")).toBe("evenodd");

    const generatedPreview = symbolPreview({ id: "gen", name: "Generated", category: "Test", generator: "star5" });
    expect(generatedPreview.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
    expect(generatedPreview.querySelector("path")?.getAttribute("d")).toContain("M");
  });
});