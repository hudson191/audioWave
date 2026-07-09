/**
 * Renderizador OFFLINE para o export rápido (WebCodecs).
 *
 * Desenha um quadro por vez num canvas na resolução alvo, reaproveitando as
 * MESMAS cenas do preview (sceneRegistry) e a MESMA composição (fundo cover +
 * camada da caixa do elemento). Não usa rAF/ResizeObserver — o chamador
 * controla o avanço dos quadros.
 */
import type {
  AudioFrame,
  ScenePalette,
  SceneSettings,
} from "../shared/types";
import type { RenderScene } from "./types";
import { sceneRegistry } from "./sceneRegistry";
import { clampSettings } from "./settings";
import { drawImageCover, elementRect, imageSize } from "./compose";

export interface OfflineRendererOptions {
  width: number;
  height: number;
  palette: ScenePalette;
  settings: SceneSettings;
  /** Fábrica de canvas (injetável p/ testes; produção usa OffscreenCanvas). */
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
}

type AnyContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export class OfflineRenderer {
  private readonly width: number;
  private readonly height: number;
  private readonly target: HTMLCanvasElement;
  private readonly ctx: AnyContext2D;
  private readonly layer: HTMLCanvasElement;
  private readonly layerCtx: AnyContext2D;
  private readonly settings: SceneSettings;
  private palette: ScenePalette;
  private scene: RenderScene | null = null;
  private sceneId: string | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private centerImage: HTMLImageElement | null = null;

  constructor(opts: OfflineRendererOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.settings = clampSettings(opts.settings);
    this.palette = { ...opts.palette, colors: [...opts.palette.colors] };

    this.target = opts.createCanvas(this.width, this.height);
    const ctx = this.target.getContext("2d");
    if (!ctx) {
      throw new Error("OfflineRenderer: canvas 2D indisponível.");
    }
    this.ctx = ctx as AnyContext2D;

    const rect = elementRect(this.settings.element, this.width, this.height);
    this.layer = opts.createCanvas(Math.round(rect.width), Math.round(rect.height));
    const layerCtx = this.layer.getContext("2d");
    if (!layerCtx) {
      throw new Error("OfflineRenderer: canvas 2D da camada indisponível.");
    }
    this.layerCtx = layerCtx as AnyContext2D;
  }

  /** Canvas alvo (fonte do VideoFrame). */
  get canvas(): HTMLCanvasElement {
    return this.target;
  }

  setBackgroundImage(image: HTMLImageElement | null): void {
    this.backgroundImage = image;
  }

  setCenterImage(image: HTMLImageElement | null): void {
    this.centerImage = image;
    this.scene?.setCenterImage?.(image);
  }

  /** Troca a cena (usado pela timeline). Reinicializa mantendo o layer. */
  setScene(sceneId: string): void {
    if (sceneId === this.sceneId && this.scene) {
      return;
    }
    this.scene?.dispose();
    const scene = sceneRegistry.create(sceneId);
    scene.setSettings(this.settings);
    scene.setCenterImage?.(this.centerImage);
    scene.init(this.sceneContext());
    this.scene = scene;
    this.sceneId = sceneId;
  }

  /** Desenha um quadro (cena → composição) no canvas alvo. dt = 1/fps. */
  renderFrame(frame: AudioFrame, dt: number): void {
    this.scene?.update(frame, dt);
    this.compose();
  }

  dispose(): void {
    this.scene?.dispose();
    this.scene = null;
    this.backgroundImage = null;
    this.centerImage = null;
  }

  private sceneContext() {
    const rect = elementRect(this.settings.element, this.width, this.height);
    return {
      canvas: this.layer,
      ctx: this.layerCtx as CanvasRenderingContext2D,
      width: rect.width,
      height: rect.height,
      palette: this.palette,
    };
  }

  private compose(): void {
    const { ctx, width, height } = this;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, width, height);
    if (this.backgroundImage) {
      const size = imageSize(this.backgroundImage);
      drawImageCover(ctx, this.backgroundImage, width, height, size.width, size.height);
    }
    const rect = elementRect(this.settings.element, width, height);
    if (this.layer.width > 0 && this.layer.height > 0) {
      ctx.drawImage(this.layer, rect.x, rect.y, rect.width, rect.height);
    }
  }
}
