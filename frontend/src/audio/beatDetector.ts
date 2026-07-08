/**
 * Detector de beats PURO (sem Web Audio).
 *
 * Algoritmo: energia dos graves vs média móvel (~1s) com threshold adaptativo
 * baseado na variância (C ≈ 1.4), período refratário de 250ms.
 * BPM: mediana dos intervalos entre beats recentes (janela 8s), estabiliza
 * após >= 4 beats, dobrado/dividido até cair na faixa 60–200.
 */

export interface BeatResult {
  readonly beat: boolean;
  readonly bpm: number | null;
}

interface EnergySample {
  readonly energy: number;
  readonly time: number;
}

const ENERGY_WINDOW_SEC = 1;
const REFRACTORY_SEC = 0.25;
const BPM_WINDOW_SEC = 8;
const MIN_BEATS_FOR_BPM = 4;
/** Amostras mínimas de histórico antes de permitir detecção (~0.33s @60fps). */
const MIN_HISTORY_SAMPLES = 20;
/** Energia mínima absoluta para um beat (evita beats em silêncio). */
const MIN_BEAT_ENERGY = 0.08;
/** C base do threshold adaptativo; reduzido pela variância, clampado ~1.4. */
const BASE_THRESHOLD_C = 1.5;
const VARIANCE_SLOPE = 2;
const MIN_THRESHOLD_C = 1.25;
const BPM_MIN = 60;
const BPM_MAX = 200;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function variance(values: readonly number[], avg: number): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, v) => acc + (v - avg) * (v - avg), 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Dobra/divide o BPM bruto até cair na faixa [60, 200]. */
function foldBpmIntoRange(raw: number): number {
  let bpm = raw;
  while (bpm > 0 && bpm < BPM_MIN) {
    bpm *= 2;
  }
  while (bpm > BPM_MAX) {
    bpm /= 2;
  }
  return Math.round(bpm);
}

export class BeatDetector {
  private history: readonly EnergySample[] = [];
  private beatTimes: readonly number[] = [];
  private lastBeatAt = Number.NEGATIVE_INFINITY;
  private lastBpm: number | null = null;

  /**
   * Processa um frame de energia dos graves (0-1) no tempo dado (segundos).
   * Retorna se este frame é um beat e a estimativa corrente de BPM
   * (null até estabilizar; mantém a última estimativa estável depois).
   */
  push(bassEnergy: number, timeSec: number): BeatResult {
    if (!Number.isFinite(bassEnergy) || !Number.isFinite(timeSec)) {
      return { beat: false, bpm: this.lastBpm };
    }
    const energy = clamp01(bassEnergy);
    const recent = this.history.filter(
      (s) => s.time <= timeSec && timeSec - s.time <= ENERGY_WINDOW_SEC,
    );
    const beat = this.isBeat(energy, timeSec, recent);

    this.history = [...recent, { energy, time: timeSec }];
    if (beat) {
      this.lastBeatAt = timeSec;
      this.beatTimes = [...this.beatTimes, timeSec];
    }
    this.beatTimes = this.beatTimes.filter((t) => timeSec - t <= BPM_WINDOW_SEC);
    this.lastBpm = this.computeBpm() ?? this.lastBpm;

    return { beat, bpm: this.lastBpm };
  }

  /** Limpa todo o estado (usar em seek/troca de faixa). */
  reset(): void {
    this.history = [];
    this.beatTimes = [];
    this.lastBeatAt = Number.NEGATIVE_INFINITY;
    this.lastBpm = null;
  }

  private isBeat(
    energy: number,
    timeSec: number,
    recent: readonly EnergySample[],
  ): boolean {
    if (recent.length < MIN_HISTORY_SAMPLES) {
      return false;
    }
    if (energy < MIN_BEAT_ENERGY) {
      return false;
    }
    if (timeSec - this.lastBeatAt < REFRACTORY_SEC) {
      return false;
    }
    const energies = recent.map((s) => s.energy);
    const avg = mean(energies);
    const spread = variance(energies, avg);
    const thresholdC = Math.min(
      BASE_THRESHOLD_C,
      Math.max(MIN_THRESHOLD_C, BASE_THRESHOLD_C - VARIANCE_SLOPE * spread),
    );
    return energy > thresholdC * avg;
  }

  private computeBpm(): number | null {
    if (this.beatTimes.length < MIN_BEATS_FOR_BPM) {
      return null;
    }
    const intervals = this.beatTimes
      .slice(1)
      .map((t, i) => t - (this.beatTimes[i] ?? t));
    const medianInterval = median(intervals);
    if (medianInterval <= 0) {
      return null;
    }
    return foldBpmIntoRange(60 / medianInterval);
  }
}

/**
 * Helper puro de conveniência: roda um BeatDetector sobre séries de
 * energia/tempo e retorna o resultado de cada frame.
 */
export function detectBeats(
  energies: readonly number[],
  times: readonly number[],
): BeatResult[] {
  const detector = new BeatDetector();
  return energies.map((energy, i) => detector.push(energy, times[i] ?? 0));
}
