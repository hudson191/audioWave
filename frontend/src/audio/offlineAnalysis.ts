/**
 * Análise de áudio OFFLINE para o export rápido (WebCodecs).
 *
 * Reproduz o pipeline do AudioEngine.getFrame — porém a partir do PCM
 * decodificado, sem tocar o áudio nem depender do AnalyserNode (que só
 * entrega dados em tempo real). Gera um AudioFrame por quadro de vídeo,
 * em sequência (o BeatDetector é estável, então os frames devem ser
 * consumidos em ordem).
 */
import type { AudioFrame } from "../shared/types";
import { computeBands, computeRms, smooth } from "./analysis";
import type { FrequencyBands } from "./analysis";
import { BeatDetector } from "./beatDetector";
import { blackmanWindow, magnitudeSpectrum } from "./fft";

const DEFAULT_FFT_SIZE = 2048;
/** smoothingTimeConstant do AnalyserNode (peso do valor ANTIGO). */
const SMOOTHING = 0.8;
/** Suavização extra das bandas por frame (igual ao AudioEngine). */
const BAND_SMOOTHING_ALPHA = 0.5;
/** Faixa dinâmica do AnalyserNode (dB) para o mapeamento em 0-255. */
const MIN_DB = -100;
const MAX_DB = -30;
const BYTE_MAX = 255;
const WAVEFORM_CENTER = 128;

export interface OfflineFrameSource {
  readonly totalFrames: number;
  readonly fps: number;
  readonly duration: number;
  /** Próximo AudioFrame da sequência (avança o BeatDetector). */
  next(): AudioFrame;
}

/** Extrai um canal mono (média dos canais) de um AudioBuffer. */
export function extractMono(buffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = buffer;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0);
    }
  }
  if (numberOfChannels > 1) {
    for (let i = 0; i < length; i += 1) {
      mono[i] = (mono[i] ?? 0) / numberOfChannels;
    }
  }
  return mono;
}

function clampByte(value: number): number {
  return Math.min(BYTE_MAX, Math.max(0, Math.round(value)));
}

/**
 * Cria a fonte de frames offline a partir do PCM mono.
 * `next()` deve ser chamado exatamente totalFrames vezes, em ordem.
 */
export function createOfflineFrameSource(
  samples: Float32Array,
  sampleRate: number,
  fps: number,
  opts: { fftSize?: number } = {},
): OfflineFrameSource {
  const fftSize = opts.fftSize ?? DEFAULT_FFT_SIZE;
  const bins = fftSize >> 1;
  const duration = samples.length / sampleRate;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const window = blackmanWindow(fftSize);

  const beatDetector = new BeatDetector();
  const timeWindow = new Float32Array(fftSize);
  const freqBytes = new Uint8Array(bins);
  const waveBytes = new Uint8Array(fftSize).fill(WAVEFORM_CENTER);
  const smoothedMag = new Float32Array(bins);
  let smoothedBands: FrequencyBands = { bass: 0, mid: 0, treble: 0 };
  let frameIndex = 0;

  const fillWindow = (endSample: number): void => {
    // janela = os `fftSize` samples terminando em endSample (como o AnalyserNode)
    const start = endSample - fftSize + 1;
    for (let i = 0; i < fftSize; i += 1) {
      const idx = start + i;
      const sample = idx >= 0 && idx < samples.length ? (samples[idx] ?? 0) : 0;
      timeWindow[i] = sample;
      waveBytes[i] = clampByte(WAVEFORM_CENTER + sample * WAVEFORM_CENTER);
    }
  };

  const updateFrequencyBytes = (): void => {
    const magnitude = magnitudeSpectrum(timeWindow, window);
    for (let k = 0; k < bins; k += 1) {
      // suavização temporal (peso do antigo = SMOOTHING)
      const mag = SMOOTHING * (smoothedMag[k] ?? 0) + (1 - SMOOTHING) * (magnitude[k] ?? 0);
      smoothedMag[k] = mag;
      const db = mag > 0 ? 20 * Math.log10(mag) : MIN_DB;
      const norm = (db - MIN_DB) / (MAX_DB - MIN_DB);
      freqBytes[k] = clampByte(norm * BYTE_MAX);
    }
  };

  return {
    totalFrames,
    fps,
    duration,
    next(): AudioFrame {
      const time = frameIndex / fps;
      const endSample = Math.round(time * sampleRate);
      fillWindow(endSample);
      updateFrequencyBytes();

      const rawBands = computeBands(freqBytes, sampleRate, fftSize);
      smoothedBands = {
        bass: smooth(smoothedBands.bass, rawBands.bass, BAND_SMOOTHING_ALPHA),
        mid: smooth(smoothedBands.mid, rawBands.mid, BAND_SMOOTHING_ALPHA),
        treble: smooth(smoothedBands.treble, rawBands.treble, BAND_SMOOTHING_ALPHA),
      };
      const level = computeRms(waveBytes);
      const { beat, bpm } = beatDetector.push(rawBands.bass, time);
      frameIndex += 1;

      return {
        // cópias: o consumidor pode reter o frame entre chamadas
        frequency: freqBytes.slice(),
        waveform: waveBytes.slice(),
        bands: { ...smoothedBands },
        level,
        beat,
        bpm,
        time,
        duration,
      };
    },
  };
}
