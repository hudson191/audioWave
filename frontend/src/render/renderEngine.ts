/**
 * RenderEngine: loop rAF com dt clampado, DPR-aware e resize automático.
 *
 * DPR: o buffer do canvas é `cssWidth * dpr`, e o contexto recebe
 * `setTransform(dpr, ...)` — as cenas trabalham SEMPRE em CSS px.
 *
 * Settings: o engine valida/clampa via clampSettings e injeta na cena
 * chamando `scene.setSettings` logo após criá-la e em todo setSettings.
 */
import type {
  AudioFrame,
  SceneContext,
  ScenePalette,
  SceneSettings,
} from "../shared/types";
import type { RenderScene } from "./types";
import { sceneRegistry } from "./sceneRegistry";
import { clampSettings, DEFAULT_SETTINGS } from "./settings";

const MAX_DT = 0.1; // segundos
const DEFAULT_DT = 1 / 60;

export class RenderEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private palette: ScenePalette;
  private settings: SceneSettings;
  private scene: RenderScene | null = null;
  private getFrame: (() => AudioFrame) | null = null;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, opts: { palette: ScenePalette }) {
    if (!opts?.palette) {
      throw new Error("RenderEngine requer uma paleta inicial válida.");
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error(
        "Não foi possível inicializar o canvas 2D. Verifique o suporte do navegador.",
      );
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.palette = clonePalette(opts.palette);
    this.settings = { ...DEFAULT_SETTINGS };
    this.syncCanvasSize();
    this.observeResize();
  }

  /** Troca a cena ativa via sceneRegistry (id desconhecido → fallback). */
  setScene(sceneId: string): void {
    if (this.disposed) return;
    this.scene?.dispose();
    const scene = sceneRegistry.create(sceneId);
    scene.setSettings(this.settings);
    scene.init(this.createSceneContext());
    this.scene = scene;
  }

  /** Valida/clampa e repassa settings à cena ativa. */
  setSettings(settings: SceneSettings): void {
    this.settings = clampSettings(settings);
    this.scene?.setSettings(this.settings);
  }

  /** Troca a paleta; a cena recebe novo contexto via resize. */
  setPalette(palette: ScenePalette): void {
    if (this.disposed) return;
    this.palette = clonePalette(palette);
    this.scene?.resize(this.createSceneContext());
  }

  /** Inicia o loop rAF consumindo frames de áudio de `getFrame`. */
  start(getFrame: () => AudioFrame): void {
    if (this.disposed) return;
    this.stop();
    this.getFrame = getFrame;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Para o loop (mantém cena e estado). */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  /** Libera loop, observer e cena. O engine não pode ser reutilizado. */
  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scene?.dispose();
    this.scene = null;
    this.getFrame = null;
    this.disposed = true;
  }

  private tick = (timestamp: number): void => {
    if (this.disposed || !this.getFrame) return;
    const dt = this.computeDt(timestamp);
    try {
      const frame = this.getFrame();
      this.scene?.update(frame, dt);
    } catch (error: unknown) {
      console.error("Erro ao renderizar frame; loop interrompido.", error);
      this.stop();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private computeDt(timestamp: number): number {
    const previous = this.lastTimestamp;
    this.lastTimestamp = timestamp;
    if (previous === null) return DEFAULT_DT;
    const dt = (timestamp - previous) / 1000;
    return Math.min(Math.max(dt, 0), MAX_DT);
  }

  private syncCanvasSize(): void {
    const dpr = getDevicePixelRatio();
    const width = this.canvas.clientWidth || this.cssWidth || this.canvas.width || 300;
    const height =
      this.canvas.clientHeight || this.cssHeight || this.canvas.height || 150;
    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
    this.canvas.width = Math.max(1, Math.round(this.cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(this.cssHeight * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private observeResize(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
  }

  private handleResize(): void {
    if (this.disposed) return;
    this.syncCanvasSize();
    this.scene?.resize(this.createSceneContext());
  }

  private createSceneContext(): SceneContext {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.cssWidth,
      height: this.cssHeight,
      palette: this.palette,
    };
  }
}

function clonePalette(palette: ScenePalette): ScenePalette {
  return { ...palette, colors: [...palette.colors] };
}

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio;
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
}
