/**
 * Helpers puros do formulário de blocos da timeline (validação de boundary).
 */
import type { TimelineBlock } from "../../shared/types";

export interface TimelineFormValues {
  sceneId: string;
  start: string;
  end: string;
}

export type TimelineFormResult =
  | { ok: true; block: TimelineBlock }
  | { ok: false; error: string };

/** Converte "12", "12.5" ou "1,5" (vírgula pt-BR) em segundos; inválido → null. */
export function parseSeconds(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Valida os campos do formulário e monta um TimelineBlock imutável. */
export function buildTimelineBlock(
  values: TimelineFormValues,
  id: string,
): TimelineFormResult {
  if (values.sceneId.trim() === "") {
    return { ok: false, error: "Escolha uma cena para o bloco." };
  }
  const start = parseSeconds(values.start);
  if (start === null) {
    return { ok: false, error: "Informe o início do bloco em segundos." };
  }
  const end = parseSeconds(values.end);
  if (end === null) {
    return { ok: false, error: "Informe o fim do bloco em segundos." };
  }
  if (start < 0) {
    return { ok: false, error: "O início não pode ser negativo." };
  }
  if (end <= start) {
    return { ok: false, error: "O fim deve ser maior que o início." };
  }
  return { ok: true, block: { id, sceneId: values.sceneId, start, end } };
}

/** Gera um id único para blocos (crypto.randomUUID com fallback). */
export function makeBlockId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
