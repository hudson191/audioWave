import { describe, expect, it } from "vitest";
import { createOfflineFrameSource, extractMono } from "./offlineAnalysis";

const SAMPLE_RATE = 44100;

/** Gera uma senoide de `freq` Hz e `seconds` segundos. */
function tone(freq: number, seconds: number, amp = 0.8): Float32Array {
  const n = Math.round(SAMPLE_RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

describe("extractMono", () => {
  it("faz a média dos canais", () => {
    const buffer = {
      numberOfChannels: 2,
      length: 3,
      getChannelData: (ch: number) =>
        ch === 0 ? new Float32Array([1, 0, -1]) : new Float32Array([0, 0.5, 1]),
    } as unknown as AudioBuffer;
    const mono = extractMono(buffer);
    expect(Array.from(mono)).toEqual([0.5, 0.25, 0]);
  });
});

describe("createOfflineFrameSource", () => {
  it("gera totalFrames = ceil(duração * fps)", () => {
    const src = createOfflineFrameSource(tone(200, 2), SAMPLE_RATE, 30);
    expect(src.totalFrames).toBe(60);
    expect(src.duration).toBeCloseTo(2, 2);
  });

  it("produz frames com estrutura de AudioFrame e tempo crescente", () => {
    const src = createOfflineFrameSource(tone(200, 1), SAMPLE_RATE, 30);
    const first = src.next();
    const second = src.next();
    expect(first.frequency.length).toBe(1024);
    expect(first.waveform.length).toBe(2048);
    expect(second.time).toBeGreaterThan(first.time);
    expect(first.duration).toBeCloseTo(1, 2);
  });

  it("um grave (60Hz) eleva a banda bass acima de mid/treble", () => {
    const src = createOfflineFrameSource(tone(60, 1.5), SAMPLE_RATE, 30);
    // avança até estabilizar a suavização
    let frame = src.next();
    for (let i = 0; i < 20; i += 1) {
      frame = src.next();
    }
    expect(frame.bands.bass).toBeGreaterThan(frame.bands.mid);
    expect(frame.bands.bass).toBeGreaterThan(frame.bands.treble);
    expect(frame.bands.bass).toBeGreaterThan(0.1);
  });

  it("um agudo (8kHz) eleva a banda treble acima de bass", () => {
    const src = createOfflineFrameSource(tone(8000, 1.5), SAMPLE_RATE, 30);
    let frame = src.next();
    for (let i = 0; i < 20; i += 1) {
      frame = src.next();
    }
    expect(frame.bands.treble).toBeGreaterThan(frame.bands.bass);
  });

  it("silêncio → sem beats e bandas ~zero", () => {
    const src = createOfflineFrameSource(
      new Float32Array(SAMPLE_RATE),
      SAMPLE_RATE,
      30,
    );
    let anyBeat = false;
    let maxBass = 0;
    for (let i = 0; i < src.totalFrames; i += 1) {
      const f = src.next();
      anyBeat = anyBeat || f.beat;
      maxBass = Math.max(maxBass, f.bands.bass);
    }
    expect(anyBeat).toBe(false);
    expect(maxBass).toBeLessThan(0.05);
  });

  it("kick pulsado a 120bpm detecta beats e BPM na faixa", () => {
    // mesma síntese do sample real (samples/teste-120bpm.wav): kick com
    // pitch-drop + ataque rápido + baixo contínuo, validado no navegador.
    const seconds = 4;
    const beatInterval = 0.5; // 120bpm
    const n = SAMPLE_RATE * seconds;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / SAMPLE_RATE;
      const tb = t % beatInterval;
      let s = 0;
      if (tb < 0.18) {
        s +=
          Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-tb * 30)) * tb) *
          Math.exp(-tb * 18) *
          0.9;
      }
      s += Math.sin(2 * Math.PI * 82.4 * t) * 0.15; // baixo contínuo
      samples[i] = Math.max(-1, Math.min(1, s));
    }
    const src = createOfflineFrameSource(samples, SAMPLE_RATE, 60);
    let beats = 0;
    let lastBpm: number | null = null;
    for (let i = 0; i < src.totalFrames; i += 1) {
      const f = src.next();
      if (f.beat) beats += 1;
      lastBpm = f.bpm;
    }
    expect(beats).toBeGreaterThanOrEqual(4);
    expect(lastBpm).not.toBeNull();
    expect(lastBpm!).toBeGreaterThanOrEqual(110);
    expect(lastBpm!).toBeLessThanOrEqual(130);
  });
});
