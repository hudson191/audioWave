/**
 * Validação PURA de arquivos de áudio (boundary de upload).
 * Sem dependência de Web Audio — 100% testável em Node/jsdom.
 */

/** Subconjunto de File suficiente para validação (File satisfaz esta interface). */
export interface AudioFileInfo {
  readonly name: string;
  readonly size: number;
  /** MIME type; pode ser string vazia quando o browser não reconhece. */
  readonly type?: string;
}

export type AudioFileValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

export const MAX_AUDIO_FILE_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a"] as const;

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/ogg",
  "application/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
]);

const FORMAT_ERROR =
  "Formato não suportado. Envie um arquivo MP3, WAV, OGG ou M4A.";
const MIME_ERROR =
  "Tipo de arquivo não suportado. Envie um arquivo de áudio MP3, WAV, OGG ou M4A.";
const EMPTY_ERROR = "O arquivo de áudio está vazio ou corrompido.";
const SIZE_ERROR = "O arquivo excede o tamanho máximo de 50MB.";

function fail(error: string): AudioFileValidationResult {
  return { ok: false, error };
}

/** Extrai a extensão (minúscula, sem ponto) ou null se não houver. */
export function extractExtension(fileName: string): string | null {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return null;
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function isAllowedExtension(extension: string): boolean {
  return (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Valida nome (extensão), MIME (quando presente) e tamanho (máx 50MB).
 * Retorna mensagens de erro amigáveis em pt-BR.
 */
export function validateAudioFile(
  file: AudioFileInfo,
): AudioFileValidationResult {
  const extension = extractExtension(file.name);
  if (extension === null || !isAllowedExtension(extension)) {
    return fail(FORMAT_ERROR);
  }

  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime !== "" && !ALLOWED_MIME_TYPES.has(mime)) {
    return fail(MIME_ERROR);
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return fail(EMPTY_ERROR);
  }
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    return fail(SIZE_ERROR);
  }

  return { ok: true };
}
