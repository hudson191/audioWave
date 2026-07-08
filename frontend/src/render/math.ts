/**
 * Matemática pura do motor de render — sem dependências de DOM.
 * Todas as funções são puras e retornam novos valores/objetos (imutável).
 */

/** Restringe `value` ao intervalo [min, max]. NaN vira `min`. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Interpolação linear entre `a` e `b` com `t` clampado em [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Suavização exponencial independente de frame-rate. */
export function expSmooth(
  current: number,
  target: number,
  dt: number,
  speed: number,
): number {
  const k = 1 - Math.exp(-Math.max(0, speed) * Math.max(0, dt));
  return current + (target - current) * k;
}

/** Converte byte (0-255) em valor normalizado 0-1. */
export function normalizeByte(byte: number): number {
  return clamp(byte, 0, 255) / 255;
}

/** Aplica sensitivity multiplicando a resposta ao áudio, clampado em 0-1. */
export function applySensitivity(value: number, sensitivity: number): number {
  return clamp(value * sensitivity, 0, 1);
}

/**
 * Agrupa bins FFT (0-255) em `barCount` barras via média por grupo,
 * normalizado 0-1. Usa a porção útil (~80% inferior) do espectro.
 */
export function mapBinsToBars(
  frequency: ArrayLike<number>,
  barCount: number,
): number[] {
  const count = Math.max(1, Math.floor(barCount));
  const usable = Math.floor(frequency.length * 0.8);
  if (usable <= 0) return new Array<number>(count).fill(0);
  const bars: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = Math.floor((i * usable) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * usable) / count));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end && j < usable; j += 1) {
      sum += frequency[j] ?? 0;
      n += 1;
    }
    bars.push(n > 0 ? normalizeByte(sum / n) : 0);
  }
  return bars;
}

/**
 * Decai picos ao longo do tempo: o pico sobe instantaneamente até o valor
 * atual e cai a `decayRate` unidades/segundo. Retorna um novo array.
 */
export function decayPeaks(
  peaks: readonly number[],
  values: readonly number[],
  dt: number,
  decayRate = 0.6,
): number[] {
  const fall = Math.max(0, decayRate) * Math.max(0, dt);
  return values.map((value, i) =>
    Math.max(clamp(value, 0, 1), (peaks[i] ?? 0) - fall),
  );
}

/** Converte hex `#RRGGBB` em string `rgba(...)`. Hex inválido → branco. */
export function hexToRgba(hex: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return `rgba(255, 255, 255, ${a})`;
  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Partícula imutável do sistema de partículas. */
export interface Particle {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** vida restante em segundos */
  readonly life: number;
  /** vida inicial em segundos */
  readonly maxLife: number;
  readonly size: number;
  readonly colorIndex: number;
}

export interface SpawnOptions {
  x: number;
  y: number;
  /** direção de emissão em radianos */
  angle: number;
  /** velocidade escalar em px/s */
  speed: number;
  /** vida em segundos */
  life: number;
  size: number;
  colorIndex: number;
}

/** Cria uma partícula emitida direcionalmente a partir de (x, y). */
export function spawnParticle(opts: SpawnOptions): Particle {
  const life = Math.max(0.01, opts.life);
  return {
    x: opts.x,
    y: opts.y,
    vx: Math.cos(opts.angle) * opts.speed,
    vy: Math.sin(opts.angle) * opts.speed,
    life,
    maxLife: life,
    size: Math.max(0.1, opts.size),
    colorIndex: Math.max(0, Math.floor(opts.colorIndex)),
  };
}

/**
 * Integra posição/velocidade/vida da partícula por `dt` segundos.
 * `drag` é o fator de velocidade retido por segundo (0-1).
 * Retorna uma NOVA partícula (imutável).
 */
export function integrate(p: Particle, dt: number, drag = 0.85): Particle {
  const safeDt = Math.max(0, dt);
  const damp = clamp(drag, 0, 1) ** safeDt;
  return {
    ...p,
    x: p.x + p.vx * safeDt,
    y: p.y + p.vy * safeDt,
    vx: p.vx * damp,
    vy: p.vy * damp,
    life: p.life - safeDt,
  };
}

/** true enquanto a partícula ainda tem vida. */
export function isAlive(p: Particle): boolean {
  return p.life > 0;
}

/** Alpha 0-1 proporcional à vida restante. */
export function particleAlpha(p: Particle): number {
  return clamp(p.life / p.maxLife, 0, 1);
}
