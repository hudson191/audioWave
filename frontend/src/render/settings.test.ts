import { describe, expect, it } from "vitest";
import { clampSettings, DEFAULT_SETTINGS } from "./settings";

describe("DEFAULT_SETTINGS", () => {
  it("tem os defaults do contrato", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      sensitivity: 1,
      intensity: 1,
      paletteId: "eyris",
    });
  });
});

describe("clampSettings", () => {
  it("mantém valores válidos", () => {
    const input = { sensitivity: 2, intensity: 1.5, paletteId: "violet" };
    expect(clampSettings(input)).toEqual(input);
  });

  it("clampa sensitivity em 0.1-3 e intensity em 0.1-2", () => {
    const low = clampSettings({ sensitivity: 0, intensity: 0, paletteId: "x" });
    expect(low.sensitivity).toBe(0.1);
    expect(low.intensity).toBe(0.1);
    const high = clampSettings({ sensitivity: 99, intensity: 99, paletteId: "x" });
    expect(high.sensitivity).toBe(3);
    expect(high.intensity).toBe(2);
  });

  it("valores não-finitos caem no default", () => {
    const out = clampSettings({
      sensitivity: Number.NaN,
      intensity: Number.POSITIVE_INFINITY,
      paletteId: "eyris",
    });
    expect(out.sensitivity).toBe(1);
    expect(out.intensity).toBe(1);
  });

  it("paletteId vazio cai no default", () => {
    expect(clampSettings({ sensitivity: 1, intensity: 1, paletteId: "" }).paletteId).toBe(
      "eyris",
    );
  });

  it("retorna novo objeto (imutável)", () => {
    const input = { sensitivity: 5, intensity: 1, paletteId: "eyris" };
    const out = clampSettings(input);
    expect(out).not.toBe(input);
    expect(input.sensitivity).toBe(5);
  });
});
