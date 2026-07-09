import { describe, expect, it } from "vitest";
import {
  blackmanWindow,
  fftInPlace,
  isPowerOfTwo,
  magnitudeSpectrum,
} from "./fft";

describe("isPowerOfTwo", () => {
  it("reconhece potências de 2", () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(1024)).toBe(true);
    expect(isPowerOfTwo(2048)).toBe(true);
  });
  it("rejeita não-potências e zero/negativos", () => {
    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(1000)).toBe(false);
    expect(isPowerOfTwo(-4)).toBe(false);
  });
});

describe("fftInPlace", () => {
  it("transforma um impulso em espectro plano", () => {
    // δ[0] → todas as magnitudes iguais a 1
    const n = 8;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    real[0] = 1;
    fftInPlace(real, imag);
    for (let k = 0; k < n; k += 1) {
      expect(Math.hypot(real[k]!, imag[k]!)).toBeCloseTo(1, 5);
    }
  });

  it("rejeita tamanho não potência de 2", () => {
    expect(() =>
      fftInPlace(new Float32Array(6), new Float32Array(6)),
    ).toThrow(/potência de 2/);
  });

  it("rejeita real/imag de tamanhos diferentes", () => {
    expect(() =>
      fftInPlace(new Float32Array(8), new Float32Array(4)),
    ).toThrow(/mesmo tamanho/);
  });
});

describe("magnitudeSpectrum", () => {
  it("uma senoide pura tem pico no bin da sua frequência", () => {
    const n = 1024;
    const bin = 64; // frequência = bin ciclos na janela
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      samples[i] = Math.sin((2 * Math.PI * bin * i) / n);
    }
    // sem janela para pico limpo neste teste sintético
    const flat = new Float32Array(n).fill(1);
    const spectrum = magnitudeSpectrum(samples, flat);
    let peakBin = 0;
    let peak = 0;
    for (let k = 0; k < spectrum.length; k += 1) {
      if (spectrum[k]! > peak) {
        peak = spectrum[k]!;
        peakBin = k;
      }
    }
    expect(peakBin).toBe(bin);
    expect(peak).toBeGreaterThan(0.4);
  });

  it("silêncio → espectro nulo", () => {
    const spectrum = magnitudeSpectrum(new Float32Array(256));
    expect(spectrum.every((v) => v === 0)).toBe(true);
  });

  it("retorna n/2 bins", () => {
    expect(magnitudeSpectrum(new Float32Array(2048)).length).toBe(1024);
  });

  it("rejeita tamanho não potência de 2", () => {
    expect(() => magnitudeSpectrum(new Float32Array(100))).toThrow(
      /potência de 2/,
    );
  });
});

describe("blackmanWindow", () => {
  it("é simétrica e começa/termina perto de zero", () => {
    const w = blackmanWindow(64);
    expect(w[0]!).toBeCloseTo(0, 2);
    expect(w[63]!).toBeCloseTo(0, 2);
    expect(w[32]!).toBeGreaterThan(0.9);
    // simetria
    for (let i = 0; i < 32; i += 1) {
      expect(w[i]!).toBeCloseTo(w[63 - i]!, 5);
    }
  });
});
