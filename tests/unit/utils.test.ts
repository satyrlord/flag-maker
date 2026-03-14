import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clamp, uid, starPath, download, svgToPng, svgToRaster, downloadDataUrl } from "@/utils";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min when below", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps to max when above", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it("returns max when value equals max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    const id = uid();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("returns a RFC 4122 UUID (36 characters, hex with hyphens)", () => {
    const id = uid();
    expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/);
  });

  it("returns unique ids on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("starPath", () => {
  it("returns a valid SVG path string for a 5-point star", () => {
    const path = starPath(50, 50, 40, 16);
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/ Z$/);
  });

  it("contains the correct number of points for 5-point star", () => {
    const path = starPath(50, 50, 40, 16, 5);
    // 10 points total (5 outer + 5 inner), so 1 M + 9 L
    const moves = path.split(" L ");
    expect(moves.length).toBe(10);
  });

  it("contains the correct number of points for 6-point star", () => {
    const path = starPath(50, 50, 40, 20, 6);
    // 12 points total, so 1 M + 11 L
    const moves = path.split(" L ");
    expect(moves.length).toBe(12);
  });

  it("first point is at the top (cx, cy - outer)", () => {
    const path = starPath(50, 50, 40, 16);
    // first point should be M 50 10 (cx, cy - outer)
    expect(path).toMatch(/^M 50 10/);
  });
});

describe("download", () => {
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    appendSpy = vi.spyOn(document.body, "appendChild").mockReturnValue(null as unknown as Node);
    removeSpy = vi.spyOn(document.body, "removeChild").mockReturnValue(null as unknown as Node);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and clicks a download link", () => {
    download("flag.svg", "<svg></svg>");
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("sets the correct filename on the link", () => {
    download("test.png", "data", "image/png");
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("test.png");
  });

  it("creates a blob with the specified MIME type", () => {
    download("file.txt", "hello", "text/plain");
    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/plain");
  });
});

describe("svgToPng", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a PNG data URL from an SVG element", async () => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // Mock viewBox.baseVal
    Object.defineProperty(svgEl, "viewBox", {
      value: { baseVal: { width: 100, height: 50 } },
    });

    const fakeDataUrl = "data:image/png;base64,abc123";
    const drawImageFn = vi.fn();
    const toDataURLFn = vi.fn().mockReturnValue(fakeDataUrl);

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: drawImageFn }),
          toDataURL: toDataURLFn,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    // Mock Image to trigger onload synchronously
    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    const result = await svgToPng(svgEl, 2);
    expect(result).toBe(fakeDataUrl);
    expect(drawImageFn).toHaveBeenCalledOnce();
    expect(toDataURLFn).toHaveBeenCalledWith("image/png", undefined);

    globalThis.Image = origImage;
  });

  it("returns empty string when canvas context is null", async () => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svgEl, "viewBox", {
      value: { baseVal: { width: 100, height: 50 } },
    });

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    const result = await svgToPng(svgEl);
    expect(result).toBe("");

    globalThis.Image = origImage;
  });
});

describe("svgToRaster", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills white background for JPEG format", async () => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svgEl, "viewBox", {
      value: { baseVal: { width: 100, height: 50 } },
    });

    const fakeDataUrl = "data:image/jpeg;base64,jpg123";
    const drawImageFn = vi.fn();
    const fillRectFn = vi.fn();
    const toDataURLFn = vi.fn().mockReturnValue(fakeDataUrl);
    const ctxMock = {
      fillStyle: "",
      fillRect: fillRectFn,
      drawImage: drawImageFn,
    };

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ctxMock,
          toDataURL: toDataURLFn,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    const result = await svgToRaster(svgEl, "image/jpeg", 1, 0.92);
    expect(result).toBe(fakeDataUrl);
    expect(ctxMock.fillStyle).toBe("#ffffff");
    expect(fillRectFn).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(drawImageFn).toHaveBeenCalledOnce();
    expect(toDataURLFn).toHaveBeenCalledWith("image/jpeg", 0.92);

    globalThis.Image = origImage;
  });

  it("does not fill background for PNG format", async () => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svgEl, "viewBox", {
      value: { baseVal: { width: 100, height: 50 } },
    });

    const fakeDataUrl = "data:image/png;base64,png123";
    const drawImageFn = vi.fn();
    const fillRectFn = vi.fn();
    const toDataURLFn = vi.fn().mockReturnValue(fakeDataUrl);

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: "",
            fillRect: fillRectFn,
            drawImage: drawImageFn,
          }),
          toDataURL: toDataURLFn,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    const result = await svgToRaster(svgEl, "image/png", 2);
    expect(result).toBe(fakeDataUrl);
    expect(fillRectFn).not.toHaveBeenCalled();
    expect(toDataURLFn).toHaveBeenCalledWith("image/png", undefined);

    globalThis.Image = origImage;
  });
});

describe("svgToRaster error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when the image fails to load", async () => {
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svgEl, "viewBox", {
      value: { baseVal: { width: 100, height: 50 } },
    });

    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      src = "";
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 0);
      }
    } as unknown as typeof Image;

    await expect(svgToRaster(svgEl, "image/png")).rejects.toThrow(
      "Failed to load SVG as image",
    );

    globalThis.Image = origImage;
  });
});

describe("downloadDataUrl", () => {
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    appendSpy = vi.spyOn(document.body, "appendChild").mockReturnValue(null as unknown as Node);
    removeSpy = vi.spyOn(document.body, "removeChild").mockReturnValue(null as unknown as Node);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and clicks a download link with the data URL", () => {
    downloadDataUrl("data:image/png;base64,abc", "flag.png");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.href).toBe("data:image/png;base64,abc");
    expect(link.download).toBe("flag.png");
  });
});
