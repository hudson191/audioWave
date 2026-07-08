import { describe, expect, it } from "vitest";
import { computeBands, computeRms, smooth } from "./analysis";

const SAMPLE_RATE = 48000;
const FFT_SIZE = 2048;
const BIN_COUNT = FFT_SIZE / 2; // 1024
// binWidth = 48000 / 2048 = 23.4375 Hz por bin

function freqWithPeak(bin: number, value = 255): Uint8Array {
  const data = new Uint8Array(BIN_COUNT);
  data[bin] = value;
  return data;
}

describe("computeBands", () => {
  it("pico em ~117Hz (bin 5) aparece só no bass", () => {
    const bands = computeBands(freqWithPeak(5), SAMPLE_RATE, FFT_SIZE);
    expect(bands.bass).toBeGreaterThan(0);
    expect(bands.mid).toBe(0);
    expect(bands.treble).toBe(0);
    // bass cobre bins 1..10 (20–250Hz): média = 255 / (10 * 255) = 0.1
    expect(bands.bass).toBeCloseTo(0.1, 5);
  });

  it("pico em ~2.3kHz (bin 100) aparece só no mid", () => {
    const bands = computeBands(freqWithPeak(100), SAMPLE_RATE, FFT_SIZE);
    expect(bands.bass).toBe(0);
    expect(bands.mid).toBeGreaterThan(0);
    expect(bands.treble).toBe(0);
  });

  it("pico em ~9.4kHz (bin 400) aparece só no treble", () => {
    const bands = computeBands(freqWithPeak(400), SAMPLE_RATE, FFT_SIZE);
    expect(bands.bass).toBe(0);
    expect(bands.mid).toBe(0);
    expect(bands.treble).toBeGreaterThan(0);
  });

  it("frequências acima de 16kHz (bin 700 ≈ 16.4kHz) ficam fora do treble", () => {
    const bands = computeBands(freqWithPeak(700), SAMPLE_RATE, FFT_SIZE);
    expect(bands).toEqual({ bass: 0, mid: 0, treble: 0 });
  });

  it("espectro cheio (255) normaliza todas as bandas para 1", () => {
    const full = new Uint8Array(BIN_COUNT).fill(255);
    const bands = computeBands(full, SAMPLE_RATE, FFT_SIZE);
    expect(bands.bass).toBeCloseTo(1, 5);
    expect(bands.mid).toBeCloseTo(1, 5);
    expect(bands.treble).toBeCloseTo(1, 5);
  });

  it("entradas inválidas retornam zeros", () => {
    expect(computeBands(new Uint8Array(0), SAMPLE_RATE, FFT_SIZE)).toEqual({
      bass: 0,
      mid: 0,
      treble: 0,
    });
    expect(computeBands(freqWithPeak(5), 0, FFT_SIZE)).toEqual({
      bass: 0,
      mid: 0,
      treble: 0,
    });
    expect(computeBands(freqWithPeak(5), SAMPLE_RATE, 0)).toEqual({
      bass: 0,
      mid: 0,
      treble: 0,
    });
  });
});

describe("computeRms", () => {
  it("silêncio (128) tem RMS 0", () => {
    expect(computeRms(new Uint8Array(2048).fill(128))).toBe(0);
  });

  it("onda de amplitude máxima tem RMS próximo de 1", () => {
    const wave = new Uint8Array(2048);
    for (let i = 0; i < wave.length; i += 1) {
      wave[i] = i % 2 === 0 ? 255 : 0;
    }
    expect(computeRms(wave)).toBeGreaterThan(0.9);
    expect(computeRms(wave)).toBeLessThanOrEqual(1);
  });

  it("array vazio retorna 0", () => {
    expect(computeRms(new Uint8Array(0))).toBe(0);
  });

  it("é clampado em 1", () => {
    expect(computeRms(new Uint8Array(64).fill(0))).toBeLessThanOrEqual(1);
  });
});

describe("smooth", () => {
  it("alpha 0 mantém o valor anterior", () => {
    expect(smooth(0.2, 0.8, 0)).toBe(0.2);
  });

  it("alpha 1 usa o valor novo", () => {
    expect(smooth(0.2, 0.8, 1)).toBe(0.8);
  });

  it("alpha 0.5 retorna o ponto médio", () => {
    expect(smooth(0, 1, 0.5)).toBe(0.5);
  });

  it("clampa alpha fora de [0,1]", () => {
    expect(smooth(0, 1, 2)).toBe(1);
    expect(smooth(0, 1, -1)).toBe(0);
  });
});
