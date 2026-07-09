/**
 * Cena "particles": partículas emitidas do centro (pool ~300 * intensity),
 * cuja emissão/velocidade reagem ao grave, com burst + flash no beat.
 * Desenho additive com as cores da paleta e trilha com fade.
 */
import type { AudioFrame, SceneContext, SceneSettings } from "../../shared/types";
import type { RenderScene } from "../types";
import {
  applySensitivity,
  clamp,
  hexToRgba,
  integrate,
  isAlive,
  particleAlpha,
  spawnParticle,
  type Particle,
} from "../math";
import { DEFAULT_SETTINGS } from "../settings";

const BASE_POOL = 300;
const TRAIL_ALPHA = 0.22;
const BASE_EMIT_RATE = 24; // partículas/s no silêncio
const BASS_EMIT_RATE = 220; // adicional proporcional ao grave
const BEAT_BURST = 36;
const TWO_PI = Math.PI * 2;

export class ParticlesScene implements RenderScene {
  readonly id = "particles";
  readonly name = "Partículas";

  private sc: SceneContext | null = null;
  private settings: SceneSettings = { ...DEFAULT_SETTINGS };
  private particles: readonly Particle[] = [];
  private emitAccumulator = 0;
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  init(sc: SceneContext): void {
    this.sc = sc;
    this.particles = [];
    this.emitAccumulator = 0;
    sc.ctx.globalCompositeOperation = "source-over";
    sc.ctx.clearRect(0, 0, sc.width, sc.height);
  }

  resize(sc: SceneContext): void {
    this.sc = sc;
  }

  setSettings(settings: SceneSettings): void {
    this.settings = { ...settings };
  }

  dispose(): void {
    this.sc = null;
    this.particles = [];
  }

  update(frame: AudioFrame, dt: number): void {
    const sc = this.sc;
    if (!sc) return;
    const bass = applySensitivity(frame.bands.bass, this.settings.sensitivity);
    const alive = this.particles.map((p) => integrate(p, dt)).filter(isAlive);
    const spawned = this.emit(sc, bass, frame.beat, dt, alive.length);
    this.particles = [...alive, ...spawned];
    this.draw(sc, frame.beat);
  }

  private poolSize(): number {
    return Math.round(BASE_POOL * clamp(this.settings.intensity, 0.1, 2));
  }

  private emit(
    sc: SceneContext,
    bass: number,
    beat: boolean,
    dt: number,
    aliveCount: number,
  ): Particle[] {
    const intensity = clamp(this.settings.intensity, 0.1, 2);
    const rate = (BASE_EMIT_RATE + BASS_EMIT_RATE * bass) * intensity;
    this.emitAccumulator += rate * Math.max(0, dt);
    let toSpawn = Math.floor(this.emitAccumulator);
    this.emitAccumulator -= toSpawn;
    if (beat) toSpawn += Math.round(BEAT_BURST * intensity);
    toSpawn = Math.min(toSpawn, Math.max(0, this.poolSize() - aliveCount));
    if (toSpawn <= 0) return [];

    const minDim = Math.min(sc.width, sc.height);
    const baseSpeed = minDim * (0.06 + 0.5 * bass) + (beat ? minDim * 0.25 : 0);
    const colorCount = Math.max(1, sc.palette.colors.length);
    const result: Particle[] = [];
    for (let i = 0; i < toSpawn; i += 1) {
      result.push(
        spawnParticle({
          x: sc.width / 2,
          y: sc.height / 2,
          angle: this.random() * TWO_PI,
          speed: baseSpeed * (0.5 + this.random()),
          life: 0.7 + this.random() * 1.2,
          size: (1.2 + this.random() * 2.4) * intensity,
          colorIndex: Math.floor(this.random() * colorCount),
        }),
      );
    }
    return result;
  }

  private draw(sc: SceneContext, beat: boolean): void {
    const { ctx, width, height, palette } = sc;
    // esmaece a trilha para TRANSPARENTE (o fundo é composto pelo engine)
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    ctx.globalCompositeOperation = "lighter";
    if (beat) {
      ctx.fillStyle = hexToRgba(palette.primary, 0.08);
      ctx.fillRect(0, 0, width, height);
    }
    const colorCount = Math.max(1, palette.colors.length);
    this.particles.forEach((p) => {
      const color = palette.colors[p.colorIndex % colorCount] ?? palette.primary;
      ctx.fillStyle = hexToRgba(color, particleAlpha(p));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  }
}
