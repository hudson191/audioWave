/**
 * Helpers puros/testáveis do fluxo de exportação de vídeo.
 */

export interface ExportResolution {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const EXPORT_RESOLUTIONS: readonly ExportResolution[] = [
  { id: "720p", label: "1280 × 720 (HD)", width: 1280, height: 720 },
  { id: "1080p", label: "1920 × 1080 (Full HD)", width: 1920, height: 1080 },
];

export const DEFAULT_RESOLUTION_ID = "1080p";

/** Resolve a resolução pelo id, com fallback para a primeira da lista. */
export function findResolution(id: string): ExportResolution {
  return (
    EXPORT_RESOLUTIONS.find((resolution) => resolution.id === id) ??
    EXPORT_RESOLUTIONS[0]
  );
}

export const MIME_CANDIDATES: readonly string[] = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/** Primeiro MIME suportado pelo MediaRecorder (injetável p/ teste). */
export function pickSupportedMimeType(
  isSupported: (type: string) => boolean,
  candidates: readonly string[] = MIME_CANDIDATES,
): string | null {
  const found = candidates.find((candidate) => {
    try {
      return isSupported(candidate);
    } catch {
      return false;
    }
  });
  return found ?? null;
}

const FALLBACK_BASE_NAME = "video";

/** Monta "audiowave-{nome}.webm" a partir do nome do áudio (sanitizado). */
export function buildExportFileName(baseName: string | null): string {
  const withoutExtension = (baseName ?? "").replace(/\.[^.]+$/, "").trim();
  const safe = withoutExtension
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `audiowave-${safe || FALLBACK_BASE_NAME}.webm`;
}

/** Progresso 0-1 da gravação a partir de tempo corrente/duração. */
export function computeExportProgress(
  currentTime: number,
  duration: number,
): number {
  if (
    !Number.isFinite(currentTime) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 0;
  }
  return Math.min(Math.max(currentTime / duration, 0), 1);
}

/**
 * Ajusta o tamanho CSS do canvas para que o buffer (CSS px × DPR) atinja
 * width×height durante a gravação. Retorna função que restaura o estilo.
 */
export function applyExportSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  devicePixelRatio: number,
): () => void {
  const previousWidth = canvas.style.width;
  const previousHeight = canvas.style.height;
  const dpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  canvas.style.width = `${width / dpr}px`;
  canvas.style.height = `${height / dpr}px`;
  return () => {
    canvas.style.width = previousWidth;
    canvas.style.height = previousHeight;
  };
}

/** Dispara o download de um Blob com o nome informado. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
