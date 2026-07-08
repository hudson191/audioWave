/**
 * Helpers PUROS de análise de áudio (bandas, RMS, suavização).
 * Nenhuma dependência de Web Audio — 100% testável.
 */

export interface FrequencyBands {
  readonly bass: number;
  readonly mid: number;
  readonly treble: number;
}

/** Faixas de frequência (Hz) de cada banda, conforme CONTRACTS.md. */
export const BAND_RANGES_HZ = {
  bass: { low: 20, high: 250 },
  mid: { low: 250, high: 4000 },
  treble: { low: 4000, high: 16000 },
} as const;

const BYTE_MAX = 255;
const WAVEFORM_CENTER = 128;

/**
 * Média normalizada (0-1) dos bins FFT dentro de [lowHz, highHz].
 * Mapeamento bin→Hz: freq(bin) = bin * sampleRate / fftSize.
 */
function averageBand(
  frequency: Uint8Array,
  binWidthHz: number,
  lowHz: number,
  highHz: number,
): number {
  const firstBin = Math.max(0, Math.ceil(lowHz / binWidthHz));
  const lastBin = Math.min(frequency.length - 1, Math.floor(highHz / binWidthHz));
  if (lastBin < firstBin) {
    return 0;
  }
  let sum = 0;
  for (let bin = firstBin; bin <= lastBin; bin += 1) {
    sum += frequency[bin] ?? 0;
  }
  return sum / ((lastBin - firstBin + 1) * BYTE_MAX);
}

/**
 * Calcula bandas bass (20–250Hz), mid (250Hz–4kHz) e treble (4k–16kHz)
 * normalizadas 0-1 a partir dos bins FFT (0-255).
 */
export function computeBands(
  frequency: Uint8Array,
  sampleRate: number,
  fftSize: number,
): FrequencyBands {
  if (
    frequency.length === 0 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isFinite(fftSize) ||
    fftSize <= 0
  ) {
    return { bass: 0, mid: 0, treble: 0 };
  }
  const binWidthHz = sampleRate / fftSize;
  return {
    bass: averageBand(frequency, binWidthHz, BAND_RANGES_HZ.bass.low, BAND_RANGES_HZ.bass.high),
    mid: averageBand(frequency, binWidthHz, BAND_RANGES_HZ.mid.low, BAND_RANGES_HZ.mid.high),
    treble: averageBand(frequency, binWidthHz, BAND_RANGES_HZ.treble.low, BAND_RANGES_HZ.treble.high),
  };
}

/**
 * RMS 0-1 do waveform time-domain (bytes 0-255, silêncio = 128).
 */
export function computeRms(waveform: Uint8Array): number {
  if (waveform.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (let i = 0; i < waveform.length; i += 1) {
    const centered = ((waveform[i] ?? WAVEFORM_CENTER) - WAVEFORM_CENTER) / WAVEFORM_CENTER;
    sumSquares += centered * centered;
  }
  return Math.min(1, Math.sqrt(sumSquares / waveform.length));
}

/**
 * Suavização exponencial: alpha é o peso do valor novo (0 = mantém prev, 1 = usa next).
 * alpha é clampado em [0, 1].
 */
export function smooth(prev: number, next: number, alpha: number): number {
  const weight = Math.min(Math.max(alpha, 0), 1);
  return prev + (next - prev) * weight;
}
