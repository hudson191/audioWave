/**
 * Helpers de composição compartilhados entre o RenderEngine (preview ao vivo)
 * e o OfflineRenderer (export). Mantêm o layout IDÊNTICO nos dois caminhos.
 */
import type { ElementBox } from "../shared/types";
import { DEFAULT_ELEMENT } from "./settings";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Caixa do elemento (em %) convertida para px do canvas alvo. */
export function elementRect(
  element: ElementBox | undefined,
  canvasWidth: number,
  canvasHeight: number,
): Rect {
  const box = element ?? DEFAULT_ELEMENT;
  return {
    x: (box.x / 100) * canvasWidth,
    y: (box.y / 100) * canvasHeight,
    width: Math.max(1, (box.width / 100) * canvasWidth),
    height: Math.max(1, (box.height / 100) * canvasHeight),
  };
}

type AnyContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/** Desenha a imagem cobrindo a área (equivalente a object-fit: cover). */
export function drawImageCover(
  ctx: AnyContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  intrinsicWidth: number,
  intrinsicHeight: number,
): void {
  if (!intrinsicWidth || !intrinsicHeight || width <= 0 || height <= 0) {
    return;
  }
  const scale = Math.max(width / intrinsicWidth, height / intrinsicHeight);
  const dw = intrinsicWidth * scale;
  const dh = intrinsicHeight * scale;
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

/** Dimensões intrínsecas de uma imagem (natural* com fallback). */
export function imageSize(image: HTMLImageElement): {
  width: number;
  height: number;
} {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}
