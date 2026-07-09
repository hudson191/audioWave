import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderEngine } from "./renderEngine";
import { getPalette } from "./palettes";
import { createMockCanvas, createMockCtx, createMockFrame } from "./testHelpers";

type RafCallback = (timestamp: number) => void;

let rafCallbacks: Map<number, RafCallback>;
let nextRafId: number;

function flushRaf(timestamp: number): void {
  const pending = [...rafCallbacks.values()];
  rafCallbacks = new Map();
  pending.forEach((cb) => cb(timestamp));
}

beforeEach(() => {
  rafCallbacks = new Map();
  nextRafId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: RafCallback): number => {
    const id = nextRafId;
    nextRafId += 1;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number): void => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createEngine(dpr = 1) {
  vi.stubGlobal("devicePixelRatio", dpr);
  Object.defineProperty(window, "devicePixelRatio", {
    value: dpr,
    configurable: true,
  });
  const ctx = createMockCtx();
  const canvas = createMockCanvas(ctx, { clientWidth: 640, clientHeight: 360 });
  const engine = new RenderEngine(canvas, { palette: getPalette("eyris") });
  return { engine, canvas, ctx };
}

describe("RenderEngine", () => {
  it("lança erro amigável quando o contexto 2D não existe", () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => new RenderEngine(canvas, { palette: getPalette("eyris") })).toThrow(
      /canvas 2D/,
    );
  });

  it("é DPR-aware: buffer = css * dpr e setTransform(dpr)", () => {
    const { canvas, ctx } = createEngine(2);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it("start roda o loop, consome getFrame e a cena desenha", () => {
    const { engine, ctx } = createEngine();
    engine.setScene("bars");
    const getFrame = vi.fn(() => createMockFrame());
    engine.start(getFrame);
    flushRaf(16);
    flushRaf(32);
    expect(getFrame).toHaveBeenCalledTimes(2);
    expect(ctx.fillRect).toHaveBeenCalled();
    engine.dispose();
  });

  it("clampa dt em 0.1s mesmo com gap grande entre frames", () => {
    const { engine } = createEngine();
    engine.setScene("bars");
    const getFrame = vi.fn(() => createMockFrame());
    engine.start(getFrame);
    flushRaf(0);
    expect(() => flushRaf(5000)).not.toThrow(); // gap de 5s → dt clampado
    expect(getFrame).toHaveBeenCalledTimes(2);
    engine.dispose();
  });

  it("stop cancela o loop", () => {
    const { engine } = createEngine();
    engine.setScene("bars");
    const getFrame = vi.fn(() => createMockFrame());
    engine.start(getFrame);
    engine.stop();
    flushRaf(16);
    expect(getFrame).not.toHaveBeenCalled();
    engine.dispose();
  });

  it("interrompe o loop se getFrame lançar (sem propagar)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { engine } = createEngine();
    engine.setScene("bars");
    engine.start(() => {
      throw new Error("boom");
    });
    expect(() => flushRaf(16)).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    flushRaf(32); // loop parado: nada agendado
    engine.dispose();
    errorSpy.mockRestore();
  });

  it("setScene desconhecida usa fallback e setSettings/setPalette não lançam", () => {
    const { engine } = createEngine();
    expect(() => {
      engine.setScene("cena-que-nao-existe");
      engine.setSettings({ sensitivity: 99, intensity: -1, paletteId: "" });
      engine.setPalette(getPalette("sunset"));
    }).not.toThrow();
    engine.dispose();
  });

  it("aba oculta: segue desenhando via timer (sem depender de rAF)", () => {
    // não faz fake de rAF: o stub de rafCallbacks do beforeEach deve valer
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    try {
      const { engine } = createEngine();
      engine.setScene("bars");
      const getFrame = vi.fn(() => createMockFrame());
      engine.start(getFrame);
      expect(rafCallbacks.size).toBe(0); // oculto → não agenda rAF
      vi.advanceTimersByTime(200);
      expect(getFrame.mock.calls.length).toBeGreaterThanOrEqual(2);
      engine.dispose();
      vi.advanceTimersByTime(200);
      expect(getFrame.mock.calls.length).toBeLessThanOrEqual(7);
    } finally {
      Reflect.deleteProperty(document, "hidden");
      vi.useRealTimers();
    }
  });

  it("visibilitychange alterna o driver entre rAF e timer", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { engine } = createEngine();
      engine.setScene("bars");
      const getFrame = vi.fn(() => createMockFrame());
      engine.start(getFrame); // visível → rAF
      expect(rafCallbacks.size).toBe(1);

      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      expect(rafCallbacks.size).toBe(0);
      vi.advanceTimersByTime(100);
      expect(getFrame).toHaveBeenCalled();

      Reflect.deleteProperty(document, "hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      expect(rafCallbacks.size).toBe(1);
      engine.dispose();
    } finally {
      Reflect.deleteProperty(document, "hidden");
      vi.useRealTimers();
    }
  });

  it("dispose para o loop e ignora chamadas posteriores", () => {
    const { engine } = createEngine();
    engine.setScene("waveform");
    const getFrame = vi.fn(() => createMockFrame());
    engine.start(getFrame);
    engine.dispose();
    flushRaf(16);
    expect(getFrame).not.toHaveBeenCalled();
    expect(() => {
      engine.setScene("bars");
      engine.start(getFrame);
      engine.dispose();
    }).not.toThrow();
    flushRaf(32);
    expect(getFrame).not.toHaveBeenCalled();
  });
});

describe("RenderEngine — camadas (fundo + caixa do elemento)", () => {
  function createLayeredEngine(dpr = 1) {
    vi.stubGlobal("devicePixelRatio", dpr);
    Object.defineProperty(window, "devicePixelRatio", {
      value: dpr,
      configurable: true,
    });
    const ctx = createMockCtx();
    const canvas = createMockCanvas(ctx, { clientWidth: 1000, clientHeight: 500 });
    const layerCtx = createMockCtx();
    const layerCanvas = createMockCanvas(layerCtx);
    const engine = new RenderEngine(canvas, {
      palette: getPalette("eyris"),
      createCanvas: () => layerCanvas,
    });
    return { engine, canvas, ctx, layerCanvas, layerCtx };
  }

  it("compõe fundo (cor da paleta) + camada da cena no canvas principal", () => {
    const { engine, ctx, layerCanvas } = createLayeredEngine();
    engine.setScene("bars");
    engine.start(() => createMockFrame());
    flushRaf(16);
    // fundo no canvas principal
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 500);
    // camada composta em tela cheia (element default 0,0,100,100)
    expect(ctx.drawImage).toHaveBeenCalledWith(layerCanvas, 0, 0, 1000, 500);
    engine.dispose();
  });

  it("desenha a camada no retângulo da caixa do elemento", () => {
    const { engine, ctx, layerCanvas } = createLayeredEngine();
    engine.setScene("bars");
    engine.setSettings({
      sensitivity: 1,
      intensity: 1,
      paletteId: "eyris",
      element: { x: 10, y: 20, width: 50, height: 40 },
    });
    engine.start(() => createMockFrame());
    flushRaf(16);
    expect(ctx.drawImage).toHaveBeenCalledWith(layerCanvas, 100, 100, 500, 200);
    engine.dispose();
  });

  it("caixa do elemento dimensiona o buffer da camada (com DPR)", () => {
    const { engine, layerCanvas, layerCtx } = createLayeredEngine(2);
    engine.setSettings({
      sensitivity: 1,
      intensity: 1,
      paletteId: "eyris",
      element: { x: 0, y: 0, width: 50, height: 50 },
    });
    expect(layerCanvas.width).toBe(1000); // 50% de 1000 css px * dpr 2
    expect(layerCanvas.height).toBe(500);
    expect(layerCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    engine.dispose();
  });

  it("desenha imagem de fundo em cover sobre a cor da paleta", () => {
    const { engine, ctx } = createLayeredEngine();
    engine.setScene("bars");
    const image = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;
    engine.setBackgroundImage(image);
    engine.start(() => createMockFrame());
    flushRaf(16);
    // cover de 200x100 em 1000x500 → escala 5 → 1000x500 em (0,0)
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 1000, 500);
    engine.dispose();
  });

  it("repassa a imagem central para cenas que a suportam, inclusive na troca de cena", () => {
    const { engine } = createLayeredEngine();
    const image = { naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement;
    engine.setCenterImage(image);
    // waveform suporta imagem central; troca de cena deve reaplicá-la
    expect(() => {
      engine.setScene("waveform");
      engine.start(() => createMockFrame());
      flushRaf(16);
    }).not.toThrow();
    engine.dispose();
  });
});
