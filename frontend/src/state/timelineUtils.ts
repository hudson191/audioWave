/**
 * Helpers puros para manipulação da timeline de cenas.
 * Blocos são intervalos [start, end) em segundos; a timeline canônica
 * está sempre ordenada por start e sem sobreposição.
 */
import type { TimelineBlock } from "../shared/types";

/** Resultado de operações que podem ser rejeitadas com erro amigável. */
export type TimelineResult =
  | { ok: true; timeline: TimelineBlock[] }
  | { ok: false; error: string };

/** Retorna uma NOVA lista ordenada por start (não muta a original). */
export function sortBlocks(
  blocks: readonly TimelineBlock[],
): TimelineBlock[] {
  return [...blocks].sort((a, b) => a.start - b.start);
}

/** Dois blocos se sobrepõem quando os intervalos [start, end) se intersectam. */
export function blocksOverlap(a: TimelineBlock, b: TimelineBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Cena ativa no instante `time` (segundos).
 * Intervalos são [start, end), mas a borda FINAL da timeline é inclusiva:
 * em t === maior end (fim do playback/export), mantém a cena do último
 * bloco em vez de saltar para o fallback (evita flash no último frame).
 * Fora de qualquer bloco, retorna `fallbackSceneId`.
 */
export function sceneIdAt(
  timeline: readonly TimelineBlock[],
  time: number,
  fallbackSceneId: string,
): string {
  const active = timeline.find(
    (block) => time >= block.start && time < block.end,
  );
  if (active) {
    return active.sceneId;
  }
  const lastEnd = timeline.reduce(
    (max, block) => Math.max(max, block.end),
    Number.NEGATIVE_INFINITY,
  );
  if (time === lastEnd) {
    const closing = timeline.find((block) => block.end === lastEnd);
    if (closing) {
      return closing.sceneId;
    }
  }
  return fallbackSceneId;
}

/** Valida um bloco isolado; retorna mensagem de erro amigável ou null. */
export function validateBlock(block: TimelineBlock): string | null {
  if (!Number.isFinite(block.start) || !Number.isFinite(block.end)) {
    return "Bloco inválido: início e fim devem ser números.";
  }
  if (block.start < 0) {
    return "O bloco não pode começar antes do início do áudio.";
  }
  if (block.end <= block.start) {
    return "O fim do bloco deve ser maior que o início.";
  }
  return null;
}

/**
 * Insere (ou substitui, se o id já existir) um bloco na timeline.
 * Rejeita blocos inválidos ou que sobreponham outros blocos.
 * Sucesso retorna uma NOVA timeline ordenada por start.
 */
export function insertBlock(
  timeline: readonly TimelineBlock[],
  block: TimelineBlock,
): TimelineResult {
  const invalid = validateBlock(block);
  if (invalid) {
    return { ok: false, error: invalid };
  }
  const conflict = timeline.find(
    (other) => other.id !== block.id && blocksOverlap(other, block),
  );
  if (conflict) {
    return {
      ok: false,
      error: "Este bloco sobrepõe outro bloco da timeline. Ajuste os tempos.",
    };
  }
  const without = timeline.filter((other) => other.id !== block.id);
  return { ok: true, timeline: sortBlocks([...without, { ...block }]) };
}

/**
 * Restringe o bloco ao intervalo [0, duration].
 * Retorna um NOVO bloco; pode resultar em bloco de duração zero
 * (o chamador decide rejeitar via validateBlock/insertBlock).
 */
export function clampBlock(
  block: TimelineBlock,
  duration: number,
): TimelineBlock {
  const max = Math.max(0, duration);
  const start = Math.min(Math.max(block.start, 0), max);
  const end = Math.min(Math.max(block.end, start), max);
  return { ...block, start, end };
}
