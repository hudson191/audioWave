import { describe, expect, it } from "vitest";
import {
  CANVAS_BACKGROUND,
  DEFAULT_PALETTE_ID,
  getPalette,
  PALETTES,
} from "./palettes";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe("PALETTES", () => {
  it("tem pelo menos 4 paletas, incluindo as obrigatórias", () => {
    const ids = Object.keys(PALETTES);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(ids).toEqual(
      expect.arrayContaining(["eyris", "violet", "emerald", "sunset"]),
    );
  });

  it("toda paleta tem >= 4 cores hex válidas", () => {
    Object.values(PALETTES).forEach((palette) => {
      expect(palette.colors.length).toBeGreaterThanOrEqual(4);
      palette.colors.forEach((color) => expect(color).toMatch(HEX_PATTERN));
    });
  });

  it("primary/secondary/accent são hex válidos", () => {
    Object.values(PALETTES).forEach((palette) => {
      expect(palette.primary).toMatch(HEX_PATTERN);
      expect(palette.secondary).toMatch(HEX_PATTERN);
      expect(palette.accent).toMatch(HEX_PATTERN);
    });
  });

  it("background é sempre o escuro fixo #0A0A0A", () => {
    expect(CANVAS_BACKGROUND).toBe("#0A0A0A");
    Object.values(PALETTES).forEach((palette) => {
      expect(palette.background).toBe(CANVAS_BACKGROUND);
    });
  });

  it("eyris usa as cores dos tokens --chart-*", () => {
    expect(PALETTES.eyris.primary).toBe("#286CF0");
    expect(PALETTES.eyris.secondary).toBe("#8C62FF");
    expect(PALETTES.eyris.colors).toContain("#05AED3");
  });
});

describe("getPalette", () => {
  it("retorna a paleta pelo id", () => {
    expect(getPalette("violet")).toBe(PALETTES.violet);
    expect(getPalette("sunset").primary).toBe("#EB4137");
  });

  it("id desconhecido cai no fallback eyris", () => {
    expect(getPalette("nao-existe")).toBe(PALETTES[DEFAULT_PALETTE_ID]);
    expect(getPalette("")).toBe(PALETTES.eyris);
  });
});
