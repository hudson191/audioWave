import { describe, expect, it } from "vitest";
import { BeatDetector, detectBeats } from "./beatDetector";

const FPS = 60;
const DT = 1 / FPS;

interface SimulationResult {
  beatTimes: number[];
  finalBpm: number | null;
  bpmAtBeat: (number | null)[];
}

/** Simula frames a 60fps chamando energyAt(frameIndex, timeSec). */
function simulate(
  detector: BeatDetector,
  durationSec: number,
  energyAt: (frame: number, time: number) => number,
): SimulationResult {
  const beatTimes: number[] = [];
  const bpmAtBeat: (number | null)[] = [];
  let finalBpm: number | null = null;
  const totalFrames = Math.round(durationSec * FPS);
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const time = frame * DT;
    const result = detector.push(energyAt(frame, time), time);
    finalBpm = result.bpm;
    if (result.beat) {
      beatTimes.push(time);
      bpmAtBeat.push(result.bpm);
    }
  }
  return { beatTimes, finalBpm, bpmAtBeat };
}

/** Trem de pulsos: pulso de 2 frames a cada intervalFrames, baseline 0.05. */
function pulseTrain(intervalFrames: number) {
  return (frame: number): number =>
    frame >= intervalFrames && frame % intervalFrames < 2 ? 0.9 : 0.05;
}

describe("BeatDetector", () => {
  it("detecta beats e BPM ≈ 120 em trem de pulsos a 120bpm", () => {
    const detector = new BeatDetector();
    // 120bpm = 1 pulso a cada 0.5s = 30 frames @60fps
    const { beatTimes, finalBpm } = simulate(detector, 10, pulseTrain(30));

    // pulsos em 0.5, 1.0, ..., 9.5 → ~19 beats
    expect(beatTimes.length).toBeGreaterThanOrEqual(15);
    expect(beatTimes.length).toBeLessThanOrEqual(20);

    // intervalos consistentes de ~0.5s
    for (let i = 1; i < beatTimes.length; i += 1) {
      const interval = beatTimes[i]! - beatTimes[i - 1]!;
      expect(interval).toBeGreaterThan(0.45);
      expect(interval).toBeLessThan(0.55);
    }

    expect(finalBpm).not.toBeNull();
    expect(finalBpm!).toBeGreaterThanOrEqual(115);
    expect(finalBpm!).toBeLessThanOrEqual(125);
  });

  it("bpm fica null até estabilizar (>= 4 beats)", () => {
    const detector = new BeatDetector();
    const { beatTimes, bpmAtBeat } = simulate(detector, 3, pulseTrain(30));
    expect(beatTimes.length).toBeGreaterThanOrEqual(4);
    // nos 3 primeiros beats ainda não há 4 beats acumulados
    expect(bpmAtBeat[0]).toBeNull();
    expect(bpmAtBeat[1]).toBeNull();
    expect(bpmAtBeat[2]).toBeNull();
    expect(bpmAtBeat[3]).not.toBeNull();
  });

  it("ruído constante não gera beats nem BPM", () => {
    const detector = new BeatDetector();
    const { beatTimes, finalBpm } = simulate(detector, 5, (frame) =>
      frame % 2 === 0 ? 0.28 : 0.32,
    );
    expect(beatTimes).toEqual([]);
    expect(finalBpm).toBeNull();
  });

  it("silêncio não gera beats", () => {
    const detector = new BeatDetector();
    const { beatTimes } = simulate(detector, 3, () => 0);
    expect(beatTimes).toEqual([]);
  });

  it("respeita período refratário de 250ms", () => {
    const detector = new BeatDetector();
    // dois pulsos separados por 100ms (frames 60 e 66)
    const { beatTimes } = simulate(detector, 1.5, (frame) =>
      frame === 60 || frame === 66 ? 0.9 : 0.05,
    );
    expect(beatTimes.length).toBe(1);
  });

  it("dobra BPM fora da faixa: pulsos a 40bpm reportam 80", () => {
    const detector = new BeatDetector();
    // 1 pulso a cada 1.5s = 90 frames → 40bpm bruto → dobrado para 80
    const { finalBpm } = simulate(detector, 12, pulseTrain(90));
    expect(finalBpm).toBe(80);
  });

  it("reset limpa histórico, beats e BPM", () => {
    const detector = new BeatDetector();
    simulate(detector, 5, pulseTrain(30));
    detector.reset();
    const first = detector.push(0.9, 100);
    // sem histórico após reset: nenhum beat imediato e bpm null
    expect(first.beat).toBe(false);
    expect(first.bpm).toBeNull();
  });

  it("ignora entradas não finitas", () => {
    const detector = new BeatDetector();
    expect(detector.push(Number.NaN, 1)).toEqual({ beat: false, bpm: null });
    expect(detector.push(0.5, Number.POSITIVE_INFINITY)).toEqual({
      beat: false,
      bpm: null,
    });
  });
});

describe("detectBeats", () => {
  it("processa séries de energia/tempo e marca beats nos pulsos", () => {
    const energies: number[] = [];
    const times: number[] = [];
    const energyOf = pulseTrain(30);
    for (let frame = 0; frame < 120; frame += 1) {
      energies.push(energyOf(frame));
      times.push(frame * DT);
    }
    const results = detectBeats(energies, times);
    expect(results).toHaveLength(120);
    const beatCount = results.filter((r) => r.beat).length;
    expect(beatCount).toBeGreaterThanOrEqual(3);
  });
});
