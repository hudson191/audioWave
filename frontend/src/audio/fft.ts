/**
 * FFT radix-2 (Cooley-Tukey), PURA e testável — sem Web Audio.
 * Usada no export offline para obter o espectro a partir do PCM decodificado,
 * substituindo o AnalyserNode (que só entrega dados em tempo real).
 */

/** Janela de Blackman (mesma família usada pelo AnalyserNode do Web Audio). */
export function blackmanWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  const a0 = 0.42;
  const a1 = 0.5;
  const a2 = 0.08;
  const denom = size - 1;
  for (let i = 0; i < size; i += 1) {
    const t = (2 * Math.PI * i) / denom;
    window[i] = a0 - a1 * Math.cos(t) + a2 * Math.cos(2 * t);
  }
  return window;
}

/** True se `n` é potência de 2 e > 0 (requisito do radix-2). */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * FFT in-place sobre arrays reais/imaginários de tamanho potência de 2.
 * Modifica `real` e `imag` no lugar (decimation-in-time, bit-reversal).
 */
export function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n !== imag.length) {
    throw new Error("fftInPlace: real e imag devem ter o mesmo tamanho.");
  }
  if (!isPowerOfTwo(n)) {
    throw new Error("fftInPlace: o tamanho deve ser potência de 2.");
  }

  // Reordenação bit-reversal
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i]!;
      real[i] = real[j]!;
      real[j] = tr;
      const ti = imag[i]!;
      imag[i] = imag[j]!;
      imag[j] = ti;
    }
  }

  // Borboletas
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k += 1) {
        const angle = step * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const a = i + k;
        const b = a + half;
        const xr = real[b]!;
        const xi = imag[b]!;
        const tr = xr * wr - xi * wi;
        const ti = xr * wi + xi * wr;
        real[b] = real[a]! - tr;
        imag[b] = imag[a]! - ti;
        real[a] = real[a]! + tr;
        imag[a] = imag[a]! + ti;
      }
    }
  }
}

/**
 * Magnitude normalizada (0-1) de cada bin [0, n/2) de um sinal real com
 * janela de Blackman aplicada. `samples.length` deve ser potência de 2.
 * A normalização divide por n (convenção do Web Audio AnalyserNode).
 */
export function magnitudeSpectrum(
  samples: Float32Array,
  window?: Float32Array,
): Float32Array {
  const n = samples.length;
  if (!isPowerOfTwo(n)) {
    throw new Error("magnitudeSpectrum: o tamanho deve ser potência de 2.");
  }
  const win = window ?? blackmanWindow(n);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    real[i] = (samples[i] ?? 0) * (win[i] ?? 1);
  }
  fftInPlace(real, imag);
  const bins = n >> 1;
  const out = new Float32Array(bins);
  for (let k = 0; k < bins; k += 1) {
    out[k] = Math.hypot(real[k]!, imag[k]!) / n;
  }
  return out;
}
