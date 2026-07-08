/**
 * Helpers de teste do módulo render (uso exclusivo em *.test.ts —
 * não exportado pelo barrel index.ts).
 */
import { vi } from "vitest";
import type { AudioFrame, SceneContext } from "../shared/types";
import { getPalette } from "./palettes";

const noop = (): void => undefined;

/** Mock mínimo de CanvasRenderingContext2D (métodos vazios espiáveis). */
export function createMockCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop: noop };
  const ctx = {
    canvas: {},
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    lineCap: "butt",
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

/** Mock mínimo de HTMLCanvasElement ligado a um ctx mock. */
export function createMockCanvas(
  ctx: CanvasRenderingContext2D,
  size: { clientWidth?: number; clientHeight?: number } = {},
): HTMLCanvasElement {
  const canvas = {
    width: 300,
    height: 150,
    clientWidth: size.clientWidth ?? 640,
    clientHeight: size.clientHeight ?? 360,
    getContext: vi.fn(() => ctx),
  };
  return canvas as unknown as HTMLCanvasElement;
}

/** SceneContext de teste com ctx mock e paleta eyris. */
export function createMockSceneContext(): SceneContext {
  const ctx = createMockCtx();
  return {
    canvas: createMockCanvas(ctx),
    ctx,
    width: 640,
    height: 360,
    palette: getPalette("eyris"),
  };
}

/** AudioFrame sintético para testes. */
export function createMockFrame(overrides: Partial<AudioFrame> = {}): AudioFrame {
  return {
    frequency: new Uint8Array(1024).fill(120),
    waveform: new Uint8Array(2048).fill(128),
    bands: { bass: 0.6, mid: 0.4, treble: 0.3 },
    level: 0.5,
    beat: false,
    bpm: 120,
    time: 1,
    duration: 60,
    ...overrides,
  };
}
