/**
 * Cena "waveform": osciloscópio radial — círculo central que pulsa com
 * level/beat e a forma de onda desenhada em anel ao redor, com trilha
 * que esmaece (fade para transparente; o fundo é do RenderEngine).
 * Suporta imagem central opcional, recortada em círculo e pulsando junto.
 */
import type { AudioFrame, SceneContext, SceneSettings } from "../../shared/types";
import type { RenderScene } from "../types";
import { applySensitivity, clamp, expSmooth, hexToRgba } from "../math";
import { DEFAULT_SETTINGS } from "../settings";

const TRAIL_ALPHA = 0.18;
const BEAT_PULSE_DECAY = 2.8; // unidades/segundo
const RING_POINTS = 180;
const TWO_PI = Math.PI * 2;

export class WaveformScene implements RenderScene {
  readonly id = "waveform";
  readonly name = "Osciloscópio";

  private sc: SceneContext | null = null;
  private settings: SceneSettings = { ...DEFAULT_SETTINGS };
  private centerImage: HTMLImageElement | null = null;
  private smoothLevel = 0;
  private beatPulse = 0;

  init(sc: SceneContext): void {
    this.sc = sc;
    this.smoothLevel = 0;
    this.beatPulse = 0;
    sc.ctx.globalCompositeOperation = "source-over";
    sc.ctx.clearRect(0, 0, sc.width, sc.height);
  }

  resize(sc: SceneContext): void {
    this.init(sc);
  }

  setSettings(settings: SceneSettings): void {
    this.settings = { ...settings };
  }

  setCenterImage(image: HTMLImageElement | null): void {
    this.centerImage = image;
  }

  dispose(): void {
    this.sc = null;
    this.centerImage = null;
  }

  update(frame: AudioFrame, dt: number): void {
    const sc = this.sc;
    if (!sc) return;
    const level = applySensitivity(frame.level, this.settings.sensitivity);
    this.smoothLevel = expSmooth(this.smoothLevel, level, dt, 10);
    if (frame.beat) this.beatPulse = 1;
    this.beatPulse = Math.max(0, this.beatPulse - BEAT_PULSE_DECAY * dt);

    this.fadeTrail(sc);
    const baseRadius = this.baseRadius(sc);
    const pulseRadius =
      baseRadius * (1 + this.smoothLevel * 0.35 + this.beatPulse * 0.3);
    this.drawCenter(sc, pulseRadius);
    this.drawRing(sc, frame.waveform, pulseRadius * 1.7);
  }

  private baseRadius(sc: SceneContext): number {
    const minDim = Math.min(sc.width, sc.height);
    return minDim * (0.08 + 0.08 * clamp(this.settings.intensity, 0.1, 2));
  }

  private fadeTrail(sc: SceneContext): void {
    const { ctx, width, height } = sc;
    // esmaece a trilha para TRANSPARENTE (o fundo é composto pelo engine)
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawCenter(sc: SceneContext, radius: number): void {
    const { ctx, width, height, palette } = sc;
    const cx = width / 2;
    const cy = height / 2;
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.6);
    glow.addColorStop(0, hexToRgba(palette.primary, 0.9));
    glow.addColorStop(0.6, hexToRgba(palette.secondary, 0.35));
    glow.addColorStop(1, hexToRgba(palette.secondary, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.6, 0, TWO_PI);
    ctx.fill();
    if (this.centerImage) {
      this.drawCenterImage(sc, this.centerImage, radius * 1.15);
      return;
    }
    ctx.fillStyle = hexToRgba(palette.primary, 0.9);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, TWO_PI);
    ctx.fill();
  }

  /** Imagem central recortada em círculo (cover), pulsando com o raio. */
  private drawCenterImage(
    sc: SceneContext,
    image: HTMLImageElement,
    radius: number,
  ): void {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih || radius <= 0) return;
    const { ctx, width, height } = sc;
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TWO_PI);
    ctx.clip();
    const scale = Math.max((radius * 2) / iw, (radius * 2) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  }

  private drawRing(
    sc: SceneContext,
    waveform: ArrayLike<number>,
    ringRadius: number,
  ): void {
    if (waveform.length === 0) return;
    const { ctx, width, height, palette } = sc;
    const cx = width / 2;
    const cy = height / 2;
    const amp =
      Math.min(width, height) *
      0.09 *
      clamp(this.settings.intensity, 0.1, 2) *
      clamp(this.settings.sensitivity, 0.1, 3);
    const stride = Math.max(1, Math.floor(waveform.length / RING_POINTS));
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = palette.accent;
    ctx.beginPath();
    for (let i = 0; i * stride < waveform.length; i += 1) {
      const sample = ((waveform[i * stride] ?? 128) - 128) / 128;
      const angle = (i * stride * TWO_PI) / waveform.length;
      const r = ringRadius + sample * amp;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }
}
