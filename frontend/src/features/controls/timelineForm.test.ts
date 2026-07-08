import { describe, expect, it } from "vitest";
import {
  buildTimelineBlock,
  makeBlockId,
  parseSeconds,
} from "./timelineForm";

describe("parseSeconds", () => {
  it("converte inteiros e decimais com ponto", () => {
    expect(parseSeconds("12")).toBe(12);
    expect(parseSeconds("12.5")).toBe(12.5);
  });

  it("aceita vírgula decimal pt-BR", () => {
    expect(parseSeconds("1,5")).toBe(1.5);
  });

  it("ignora espaços ao redor", () => {
    expect(parseSeconds("  30 ")).toBe(30);
  });

  it("retorna null para vazio ou inválido", () => {
    expect(parseSeconds("")).toBeNull();
    expect(parseSeconds("   ")).toBeNull();
    expect(parseSeconds("abc")).toBeNull();
    expect(parseSeconds("1.2.3")).toBeNull();
  });
});

describe("buildTimelineBlock", () => {
  const values = { sceneId: "bars", start: "0", end: "30" };

  it("monta um bloco válido", () => {
    const result = buildTimelineBlock(values, "b1");
    expect(result).toEqual({
      ok: true,
      block: { id: "b1", sceneId: "bars", start: 0, end: 30 },
    });
  });

  it("rejeita cena vazia", () => {
    const result = buildTimelineBlock({ ...values, sceneId: " " }, "b1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/cena/i);
    }
  });

  it("rejeita início/fim não numéricos", () => {
    expect(buildTimelineBlock({ ...values, start: "x" }, "b1").ok).toBe(false);
    expect(buildTimelineBlock({ ...values, end: "" }, "b1").ok).toBe(false);
  });

  it("rejeita início negativo", () => {
    const result = buildTimelineBlock({ ...values, start: "-1" }, "b1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/negativo/i);
    }
  });

  it("rejeita fim menor ou igual ao início", () => {
    expect(
      buildTimelineBlock({ ...values, start: "10", end: "10" }, "b1").ok,
    ).toBe(false);
    expect(
      buildTimelineBlock({ ...values, start: "10", end: "5" }, "b1").ok,
    ).toBe(false);
  });
});

describe("makeBlockId", () => {
  it("gera ids únicos e não vazios", () => {
    const a = makeBlockId();
    const b = makeBlockId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
