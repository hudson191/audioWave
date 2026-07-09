import { describe, expect, it, vi } from "vitest";
import { OfflineRenderer } from "./offlineRenderer";
import { getPalette } from "./palettes";
import { DEFAULT_SETTINGS } from "./settings";
import { createMockCtx, createMockFrame } from "./testHelpers";

function mockCanvasFactory() {
  const created: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] =
    [];
  const factory = (width: number, height: number): HTMLCanvasElement => {
    const ctx = createMockCtx();
    const canvas = {
      width,
      height,
      getContext: vi.fn(() => ctx),
    } as unknown as HTMLCanvasElement;
    created.push({ canvas, ctx });
    return canvas;
  };
  return { factory, created };
}

describe("OfflineRenderer", () => {
  it("cria canvas alvo na resolução pedida", () => {
    const { factory } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 1920,
      height: 1080,
      palette: getPalette("eyris"),
      settings: DEFAULT_SETTINGS,
      createCanvas: factory,
    });
    expect(renderer.canvas.width).toBe(1920);
    expect(renderer.canvas.height).toBe(1080);
    renderer.dispose();
  });

  it("renderFrame desenha a cena e compõe no alvo", () => {
    const { factory, created } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 640,
      height: 360,
      palette: getPalette("eyris"),
      settings: DEFAULT_SETTINGS,
      createCanvas: factory,
    });
    renderer.setScene("bars");
    renderer.renderFrame(createMockFrame(), 1 / 30);
    const targetCtx = created[0]!.ctx;
    // fundo no alvo + composição da camada
    expect(targetCtx.fillRect).toHaveBeenCalledWith(0, 0, 640, 360);
    expect(targetCtx.drawImage).toHaveBeenCalled();
    renderer.dispose();
  });

  it("caixa do elemento dimensiona o canvas da camada", () => {
    const { factory, created } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 1000,
      height: 500,
      palette: getPalette("eyris"),
      settings: { ...DEFAULT_SETTINGS, element: { x: 10, y: 20, width: 50, height: 40 } },
      createCanvas: factory,
    });
    // created[0] = alvo, created[1] = camada
    expect(created[1]!.canvas.width).toBe(500); // 50% de 1000
    expect(created[1]!.canvas.height).toBe(200); // 40% de 500
    renderer.dispose();
  });

  it("compõe a camada no retângulo da caixa do elemento", () => {
    const { factory, created } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 1000,
      height: 500,
      palette: getPalette("eyris"),
      settings: { ...DEFAULT_SETTINGS, element: { x: 10, y: 20, width: 50, height: 40 } },
      createCanvas: factory,
    });
    renderer.setScene("bars");
    renderer.renderFrame(createMockFrame(), 1 / 30);
    const targetCtx = created[0]!.ctx;
    const layerCanvas = created[1]!.canvas;
    expect(targetCtx.drawImage).toHaveBeenCalledWith(
      layerCanvas,
      100,
      100,
      500,
      200,
    );
    renderer.dispose();
  });

  it("troca de cena (timeline) sem lançar e é idempotente para o mesmo id", () => {
    const { factory } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 640,
      height: 360,
      palette: getPalette("eyris"),
      settings: DEFAULT_SETTINGS,
      createCanvas: factory,
    });
    expect(() => {
      renderer.setScene("bars");
      renderer.renderFrame(createMockFrame(), 1 / 30);
      renderer.setScene("bars"); // mesmo id: no-op
      renderer.setScene("waveform");
      renderer.renderFrame(createMockFrame({ beat: true }), 1 / 30);
      renderer.setScene("particles");
      renderer.renderFrame(createMockFrame(), 1 / 30);
    }).not.toThrow();
    renderer.dispose();
  });

  it("desenha imagem de fundo em cover sobre a cor da paleta", () => {
    const { factory, created } = mockCanvasFactory();
    const renderer = new OfflineRenderer({
      width: 1000,
      height: 500,
      palette: getPalette("eyris"),
      settings: DEFAULT_SETTINGS,
      createCanvas: factory,
    });
    renderer.setScene("bars");
    const image = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
    renderer.setBackgroundImage(image);
    renderer.renderFrame(createMockFrame(), 1 / 30);
    const targetCtx = created[0]!.ctx;
    expect(targetCtx.drawImage).toHaveBeenCalledWith(image, 0, 0, 1000, 500);
    renderer.dispose();
  });
});
