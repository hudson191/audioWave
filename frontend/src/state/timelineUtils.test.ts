import { describe, expect, it } from "vitest";
import type { TimelineBlock } from "../shared/types";
import {
  blocksOverlap,
  clampBlock,
  insertBlock,
  sceneIdAt,
  sortBlocks,
  validateBlock,
} from "./timelineUtils";

function block(
  id: string,
  start: number,
  end: number,
  sceneId = "bars",
): TimelineBlock {
  return { id, sceneId, start, end };
}

describe("sortBlocks", () => {
  it("ordena por start sem mutar a lista original", () => {
    const original = [block("b", 10, 20), block("a", 0, 5), block("c", 30, 40)];
    const sorted = sortBlocks(original);

    expect(sorted.map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(original.map((b) => b.id)).toEqual(["b", "a", "c"]);
    expect(sorted).not.toBe(original);
  });

  it("retorna lista vazia para entrada vazia", () => {
    expect(sortBlocks([])).toEqual([]);
  });
});

describe("blocksOverlap", () => {
  it("detecta sobreposição parcial", () => {
    expect(blocksOverlap(block("a", 0, 10), block("b", 5, 15))).toBe(true);
  });

  it("detecta contenção total", () => {
    expect(blocksOverlap(block("a", 0, 20), block("b", 5, 10))).toBe(true);
  });

  it("blocos adjacentes (end == start) NÃO se sobrepõem", () => {
    expect(blocksOverlap(block("a", 0, 10), block("b", 10, 20))).toBe(false);
  });

  it("blocos disjuntos não se sobrepõem", () => {
    expect(blocksOverlap(block("a", 0, 5), block("b", 10, 20))).toBe(false);
  });
});

describe("sceneIdAt", () => {
  const timeline = [
    block("a", 0, 10, "bars"),
    block("b", 10, 20, "waveform"),
  ];

  it("retorna a cena do bloco ativo (start inclusivo)", () => {
    expect(sceneIdAt(timeline, 0, "fallback")).toBe("bars");
    expect(sceneIdAt(timeline, 10, "fallback")).toBe("waveform");
  });

  it("end é exclusivo nas bordas internas (bloco seguinte vence)", () => {
    expect(sceneIdAt(timeline, 10, "fallback")).toBe("waveform");
  });

  it("borda final da timeline é inclusiva (sem flash no último frame)", () => {
    // t === maior end (fim do playback/export) mantém a cena do último bloco
    expect(sceneIdAt(timeline, 20, "fallback")).toBe("waveform");
  });

  it("fim de bloco no meio da timeline (com gap) continua exclusivo", () => {
    const withGap = [block("a", 0, 10, "bars"), block("b", 15, 20, "waveform")];
    expect(sceneIdAt(withGap, 10, "fallback")).toBe("fallback");
    expect(sceneIdAt(withGap, 20, "fallback")).toBe("waveform");
  });

  it("retorna fallback fora de qualquer bloco", () => {
    expect(sceneIdAt(timeline, 999, "particles")).toBe("particles");
    expect(sceneIdAt(timeline, 20.001, "particles")).toBe("particles");
    expect(sceneIdAt([], 5, "particles")).toBe("particles");
  });
});

describe("validateBlock", () => {
  it("aceita bloco válido", () => {
    expect(validateBlock(block("a", 0, 10))).toBeNull();
  });

  it("rejeita start negativo", () => {
    expect(validateBlock(block("a", -1, 10))).toMatch(/não pode começar/);
  });

  it("rejeita end <= start", () => {
    expect(validateBlock(block("a", 10, 10))).toMatch(/maior que o início/);
    expect(validateBlock(block("a", 10, 5))).toMatch(/maior que o início/);
  });

  it("rejeita valores não finitos", () => {
    expect(validateBlock(block("a", Number.NaN, 10))).toMatch(/inválido/);
    expect(
      validateBlock(block("a", 0, Number.POSITIVE_INFINITY)),
    ).toMatch(/inválido/);
  });
});

describe("insertBlock", () => {
  it("insere em timeline vazia", () => {
    const result = insertBlock([], block("a", 0, 10));
    expect(result).toEqual({ ok: true, timeline: [block("a", 0, 10)] });
  });

  it("mantém ordenação por start", () => {
    const result = insertBlock([block("b", 10, 20)], block("a", 0, 5));
    if (!result.ok) throw new Error("esperava sucesso");
    expect(result.timeline.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("rejeita sobreposição com erro amigável", () => {
    const result = insertBlock([block("a", 0, 10)], block("b", 5, 15));
    expect(result).toEqual({
      ok: false,
      error: "Este bloco sobrepõe outro bloco da timeline. Ajuste os tempos.",
    });
  });

  it("permite blocos adjacentes", () => {
    const result = insertBlock([block("a", 0, 10)], block("b", 10, 20));
    expect(result.ok).toBe(true);
  });

  it("substitui bloco de mesmo id (mover) sem acusar auto-sobreposição", () => {
    const result = insertBlock(
      [block("a", 0, 10), block("b", 20, 30)],
      block("a", 12, 18),
    );
    if (!result.ok) throw new Error("esperava sucesso");
    expect(result.timeline).toEqual([block("a", 12, 18), block("b", 20, 30)]);
  });

  it("rejeita mover para cima de outro bloco", () => {
    const result = insertBlock(
      [block("a", 0, 10), block("b", 20, 30)],
      block("a", 25, 35),
    );
    expect(result.ok).toBe(false);
  });

  it("rejeita bloco inválido", () => {
    const result = insertBlock([], block("a", 5, 5));
    expect(result.ok).toBe(false);
  });

  it("não muta a timeline original", () => {
    const original = [block("a", 0, 10)];
    insertBlock(original, block("b", 10, 20));
    expect(original).toEqual([block("a", 0, 10)]);
  });
});

describe("clampBlock", () => {
  it("mantém bloco dentro do intervalo", () => {
    expect(clampBlock(block("a", 5, 10), 60)).toEqual(block("a", 5, 10));
  });

  it("clampa start negativo para 0", () => {
    expect(clampBlock(block("a", -5, 10), 60)).toEqual(block("a", 0, 10));
  });

  it("clampa end além da duração", () => {
    expect(clampBlock(block("a", 50, 90), 60)).toEqual(block("a", 50, 60));
  });

  it("bloco totalmente fora vira duração zero no limite", () => {
    expect(clampBlock(block("a", 70, 90), 60)).toEqual(block("a", 60, 60));
  });

  it("duração negativa é tratada como 0", () => {
    expect(clampBlock(block("a", 5, 10), -1)).toEqual(block("a", 0, 0));
  });

  it("retorna novo objeto (imutável)", () => {
    const original = block("a", -5, 10);
    const clamped = clampBlock(original, 60);
    expect(clamped).not.toBe(original);
    expect(original.start).toBe(-5);
  });
});
