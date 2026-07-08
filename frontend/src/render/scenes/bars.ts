/**
 * Cena "bars": barras de frequência espelhadas verticalmente, com
 * gradiente da paleta, glow additive e marcador de pico com decay.
 */
import type { AudioFrame, SceneContext, SceneSettings } from "../../shared/types";
import type { RenderScene } from "../types";
import { applySensitivity, clamp, decayPeaks, mapBinsToBars } from "../math";
import { DEFAULT_SETTINGS } from "../settings";

const BASE_BARS = 48;
const MIN_BARS = 8;
const MAX_BARS = 96;
const PEAK_DECAY_RATE = 0.5;

export class BarsScene implements RenderScene {
  readonly id = "bars";
  readonly name = "Barras";

  private sc: SceneContext | null = null;
  private settings: SceneSettings = { ...DEFAULT_SETTINGS };
  private peaks: readonly number[] = [];

  init(sc: SceneContext): void {
    this.sc = sc;
    this.peaks = [];
  }

  resize(sc: SceneContext): void {
    this.sc = sc;
  }

  setSettings(settings: SceneSettings): void {
    this.settings = { ...settings };
  }

  dispose(): void {
    this.sc = null;
    this.peaks = [];
  }

  update(frame: AudioFrame, dt: number): void {
    const sc = this.sc;
    if (!sc) return;
    const barCount = Math.round(
      clamp(BASE_BARS * this.settings.intensity, MIN_BARS, MAX_BARS),
    );
    const values = mapBinsToBars(frame.frequency, barCount).map((v) =>
      applySensitivity(v, this.settings.sensitivity),
    );
    this.peaks = decayPeaks(this.peaks, values, dt, PEAK_DECAY_RATE);
    this.draw(sc, values, this.peaks);
  }

  private draw(
    sc: SceneContext,
    values: readonly number[],
    peaks: readonly number[],
  ): void {
    const { ctx, width, height, palette } = sc;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const slot = width / Math.max(1, values.length);
    const barWidth = Math.max(1, slot * 0.6);
    const centerY = height / 2;
    const maxBar = height * 0.42;

    const gradient = ctx.createLinearGradient(
      0,
      centerY - maxBar,
      0,
      centerY + maxBar,
    );
    gradient.addColorStop(0, palette.accent);
    gradient.addColorStop(0.5, palette.primary);
    gradient.addColorStop(1, palette.secondary);

    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 14;
    ctx.shadowColor = palette.primary;
    ctx.fillStyle = gradient;
    values.forEach((value, i) => {
      const h = Math.max(1, value * maxBar);
      const x = i * slot + (slot - barWidth) / 2;
      ctx.fillRect(x, centerY - h, barWidth, h * 2);
    });

    this.drawPeaks(sc, peaks, slot, barWidth, centerY, maxBar);
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawPeaks(
    sc: SceneContext,
    peaks: readonly number[],
    slot: number,
    barWidth: number,
    centerY: number,
    maxBar: number,
  ): void {
    const { ctx, palette } = sc;
    ctx.fillStyle = palette.accent;
    ctx.shadowBlur = 8;
    ctx.shadowColor = palette.accent;
    peaks.forEach((peak, i) => {
      if (peak <= 0.01) return;
      const offset = peak * maxBar;
      const x = i * slot + (slot - barWidth) / 2;
      ctx.fillRect(x, centerY - offset - 4, barWidth, 2);
      ctx.fillRect(x, centerY + offset + 2, barWidth, 2);
    });
  }
}
