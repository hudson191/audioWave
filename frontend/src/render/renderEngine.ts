/**
 * RenderEngine: loop rAF com dt clampado, DPR-aware e resize automático.
 *
 * DPR: o buffer do canvas é `cssWidth * dpr`, e o contexto recebe
 * `setTransform(dpr, ...)` — as cenas trabalham SEMPRE em CSS px.
 *
 * CAMADAS: a cena desenha numa camada offscreen do tamanho da caixa do
 * elemento (settings.element, em % do canvas). A cada frame o engine compõe:
 * fundo (imagem cover ou cor da paleta) → camada da cena no retângulo do
 * elemento. Sem contexto 2D para a camada (ex.: jsdom), cai no modo direto
 * (cena desenha no canvas principal; fundo/elemento ficam indisponíveis).
 *
 * Settings: o engine valida/clampa via clampSettings e injeta na cena
 * chamando `scene.setSettings` logo após criá-la e em todo setSettings.
 */
import type {
  AudioFrame,
  ElementBox,
  SceneContext,
  ScenePalette,
  SceneSettings,
} from "../shared/types";
import type { RenderScene } from "./types";
import { sceneRegistry } from "./sceneRegistry";
import { clampSettings, DEFAULT_ELEMENT, DEFAULT_SETTINGS } from "./settings";
import { drawImageCover, elementRect, imageSize } from "./compose";

const MAX_DT = 0.1; // segundos
const DEFAULT_DT = 1 / 60;
/**
 * Em aba oculta o rAF é suspenso, mas o áudio (e uma eventual exportação via
 * MediaRecorder) continua: o loop cai para setTimeout para seguir desenhando.
 * Navegadores clampam timers em background (~1s), ainda assim >> congelado.
 */
const HIDDEN_FRAME_INTERVAL_MS = 1000 / 30;

export interface RenderEngineOptions {
  palette: ScenePalette;
  /** Fábrica da camada offscreen (injetável para testes). */
  createCanvas?: () => HTMLCanvasElement;
}

export class RenderEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly layerCanvas: HTMLCanvasElement | null;
  private readonly layerCtx: CanvasRenderingContext2D | null;
  private palette: ScenePalette;
  private settings: SceneSettings;
  private scene: RenderScene | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private centerImage: HTMLImageElement | null = null;
  private getFrame: (() => AudioFrame) | null = null;
  private rafId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastTimestamp: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, opts: RenderEngineOptions) {
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
    const layer = createLayerCanvas(opts.createCanvas);
    this.layerCanvas = layer?.canvas ?? null;
    this.layerCtx = layer?.ctx ?? null;
    this.palette = clonePalette(opts.palette);
    this.settings = { ...DEFAULT_SETTINGS, element: { ...DEFAULT_ELEMENT } };
    this.syncCanvasSize();
    this.observeResize();
  }

  /** Troca a cena ativa via sceneRegistry (id desconhecido → fallback). */
  setScene(sceneId: string): void {
    if (this.disposed) return;
    this.scene?.dispose();
    const scene = sceneRegistry.create(sceneId);
    scene.setSettings(this.settings);
    scene.setCenterImage?.(this.centerImage);
    scene.init(this.createSceneContext());
    this.scene = scene;
  }

  /** Valida/clampa e repassa settings à cena ativa. */
  setSettings(settings: SceneSettings): void {
    const next = clampSettings(settings);
    const elementChanged = !sameElement(this.settings.element, next.element);
    this.settings = next;
    this.scene?.setSettings(this.settings);
    if (elementChanged) {
      this.syncLayerSize();
      this.scene?.resize(this.createSceneContext());
    }
  }

  /** Troca a paleta; a cena recebe novo contexto via resize. */
  setPalette(palette: ScenePalette): void {
    if (this.disposed) return;
    this.palette = clonePalette(palette);
    this.scene?.resize(this.createSceneContext());
  }

  /** Imagem de fundo do vídeo (cover). `null` volta à cor da paleta. */
  setBackgroundImage(image: HTMLImageElement | null): void {
    if (this.disposed) return;
    this.backgroundImage = image;
  }

  /** Imagem central (repassada a cenas que a suportam, ex.: osciloscópio). */
  setCenterImage(image: HTMLImageElement | null): void {
    if (this.disposed) return;
    this.centerImage = image;
    this.scene?.setCenterImage?.(image);
  }

  /** Inicia o loop rAF consumindo frames de áudio de `getFrame`. */
  start(getFrame: () => AudioFrame): void {
    if (this.disposed) return;
    this.stop();
    this.getFrame = getFrame;
    this.listenVisibility(true);
    this.scheduleNext();
  }

  /** Para o loop (mantém cena e estado). */
  stop(): void {
    this.listenVisibility(false);
    this.cancelScheduled();
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
    this.backgroundImage = null;
    this.centerImage = null;
    this.disposed = true;
  }

  private tick = (timestamp: number): void => {
    if (this.disposed || !this.getFrame) return;
    const dt = this.computeDt(timestamp);
    try {
      const frame = this.getFrame();
      this.scene?.update(frame, dt);
      this.compose();
    } catch (error: unknown) {
      console.error("Erro ao renderizar frame; loop interrompido.", error);
      this.stop();
      return;
    }
    this.scheduleNext();
  };

  /** Compõe fundo + camada da cena no canvas principal. */
  private compose(): void {
    if (!this.layerCanvas || !this.layerCtx) {
      return; // modo direto: a cena já desenhou no canvas principal
    }
    const { ctx, cssWidth, cssHeight } = this;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    if (this.backgroundImage) {
      const { width, height } = imageSize(this.backgroundImage);
      drawImageCover(ctx, this.backgroundImage, cssWidth, cssHeight, width, height);
    }
    const rect = this.elementRect();
    if (this.layerCanvas.width > 0 && this.layerCanvas.height > 0) {
      ctx.drawImage(this.layerCanvas, rect.x, rect.y, rect.width, rect.height);
    }
  }

  /** Caixa do elemento em CSS px, derivada de settings.element (%). */
  private elementRect(): { x: number; y: number; width: number; height: number } {
    return elementRect(this.settings.element, this.cssWidth, this.cssHeight);
  }

  /** Agenda o próximo frame: rAF quando visível, setTimeout quando oculto. */
  private scheduleNext(): void {
    if (this.disposed || !this.getFrame) return;
    if (isDocumentHidden()) {
      this.timerId = setTimeout(() => {
        this.timerId = null;
        this.tick(performance.now());
      }, HIDDEN_FRAME_INTERVAL_MS);
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  }

  private cancelScheduled(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /** Ao mudar a visibilidade, reagenda no driver adequado (rAF ↔ timer). */
  private readonly handleVisibilityChange = (): void => {
    if (this.disposed || !this.getFrame) return;
    this.cancelScheduled();
    this.scheduleNext();
  };

  private listenVisibility(active: boolean): void {
    if (typeof document === "undefined") return;
    if (active) {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    } else {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
  }

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
    this.syncLayerSize();
  }

  /** Ajusta o buffer da camada ao tamanho da caixa do elemento. */
  private syncLayerSize(): void {
    if (!this.layerCanvas || !this.layerCtx) return;
    const dpr = getDevicePixelRatio();
    const rect = this.elementRect();
    this.layerCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.layerCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  /**
   * Contexto entregue às cenas: com camada disponível, é a camada no tamanho
   * do elemento; sem ela (fallback), o canvas principal inteiro.
   */
  private createSceneContext(): SceneContext {
    if (this.layerCanvas && this.layerCtx) {
      const rect = this.elementRect();
      return {
        canvas: this.layerCanvas,
        ctx: this.layerCtx,
        width: rect.width,
        height: rect.height,
        palette: this.palette,
      };
    }
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.cssWidth,
      height: this.cssHeight,
      palette: this.palette,
    };
  }
}

function createLayerCanvas(
  factory?: () => HTMLCanvasElement,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  try {
    const canvas = factory
      ? factory()
      : typeof document !== "undefined"
        ? document.createElement("canvas")
        : null;
    const ctx = canvas?.getContext("2d") ?? null;
    return canvas && ctx ? { canvas, ctx } : null;
  } catch {
    return null;
  }
}

function sameElement(
  a: ElementBox | undefined,
  b: ElementBox | undefined,
): boolean {
  const ea = a ?? DEFAULT_ELEMENT;
  const eb = b ?? DEFAULT_ELEMENT;
  return (
    ea.x === eb.x &&
    ea.y === eb.y &&
    ea.width === eb.width &&
    ea.height === eb.height
  );
}

function clonePalette(palette: ScenePalette): ScenePalette {
  return { ...palette, colors: [...palette.colors] };
}

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio;
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
}

function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}
