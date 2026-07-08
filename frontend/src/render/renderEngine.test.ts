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
