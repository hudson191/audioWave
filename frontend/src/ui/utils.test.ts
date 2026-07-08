import { describe, expect, it } from "vitest";
import {
  clamp,
  cx,
  filterFilesByAccept,
  formatPercent,
  isTheme,
  pctFromValue,
  resolveInitialTheme,
} from "./utils";

describe("cx", () => {
  it("junta classes e ignora falsy", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
    expect(cx()).toBe("");
  });
});

describe("clamp", () => {
  it("restringe ao intervalo", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("retorna min para valores não finitos", () => {
    expect(clamp(Number.NaN, 0, 10)).toBe(0);
    expect(clamp(Infinity, 0, 10)).toBe(10);
  });
});

describe("pctFromValue", () => {
  it("calcula o percentual entre min e max", () => {
    expect(pctFromValue(50, 0, 100)).toBe(50);
    expect(pctFromValue(1, 0.1, 3)).toBeCloseTo(31.034, 2);
    expect(pctFromValue(0, -10, 10)).toBe(50);
  });

  it("limita a 0–100", () => {
    expect(pctFromValue(200, 0, 100)).toBe(100);
    expect(pctFromValue(-5, 0, 100)).toBe(0);
  });

  it("retorna 0 para entradas inválidas", () => {
    expect(pctFromValue(Number.NaN, 0, 100)).toBe(0);
    expect(pctFromValue(5, 10, 10)).toBe(0);
    expect(pctFromValue(5, 10, 0)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("formata fração como percentual inteiro", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.427)).toBe("43%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("limita fora do intervalo", () => {
    expect(formatPercent(-1)).toBe("0%");
    expect(formatPercent(2)).toBe("100%");
  });
});

describe("isTheme / resolveInitialTheme", () => {
  it("valida somente light/dark", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("prioriza valor persistido válido", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  it("cai na preferência do sistema com valor inválido", () => {
    expect(resolveInitialTheme("x", true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });
});

describe("filterFilesByAccept", () => {
  const mp3 = new File(["a"], "musica.MP3", { type: "audio/mpeg" });
  const png = new File(["b"], "capa.png", { type: "image/png" });
  const wav = new File(["c"], "som.wav", { type: "audio/wav" });

  it("aceita tudo sem accept", () => {
    const result = filterFilesByAccept([mp3, png]);
    expect(result.accepted).toEqual([mp3, png]);
    expect(result.rejected).toEqual([]);
  });

  it("filtra por extensão (case-insensitive)", () => {
    const result = filterFilesByAccept([mp3, png], ".mp3");
    expect(result.accepted).toEqual([mp3]);
    expect(result.rejected).toEqual([png]);
  });

  it("filtra por MIME exato e curinga", () => {
    expect(filterFilesByAccept([mp3, png], "audio/mpeg").accepted).toEqual([
      mp3,
    ]);
    const wildcard = filterFilesByAccept([mp3, wav, png], "audio/*");
    expect(wildcard.accepted).toEqual([mp3, wav]);
    expect(wildcard.rejected).toEqual([png]);
  });

  it("aceita lista de tokens separados por vírgula", () => {
    const result = filterFilesByAccept([mp3, png, wav], ".png, audio/wav");
    expect(result.accepted).toEqual([png, wav]);
    expect(result.rejected).toEqual([mp3]);
  });

  it("não muta a lista original", () => {
    const files = [mp3, png];
    filterFilesByAccept(files, ".mp3");
    expect(files).toEqual([mp3, png]);
  });
});
