/**
 * Testes do AudioEngine com Web Audio API simulada (sem áudio real).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine, FFT_SIZE, ANALYSER_SMOOTHING } from "./audioEngine";
import type { PlaybackStatus } from "../shared/types";

class FakeNode {
  connections: unknown[] = [];
  connect(node: unknown): void {
    this.connections = [...this.connections, node];
  }
  disconnect(): void {}
}

class FakeGain extends FakeNode {
  gain = { value: 1 };
}

class FakeAnalyser extends FakeNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  getByteFrequencyData(array: Uint8Array): void {
    array.fill(100);
  }
  getByteTimeDomainData(array: Uint8Array): void {
    array.fill(128);
  }
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  startArgs: [number, number] | null = null;
  stopped = false;
  start(when: number, offset: number): void {
    this.startArgs = [when, offset];
  }
  stop(): void {
    this.stopped = true;
  }
}

class FakeStreamDestination extends FakeNode {
  stream = { id: "fake-stream" } as unknown as MediaStream;
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  sampleRate = 48000;
  state: AudioContextState = "running";
  destination = new FakeNode();
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  analysers: FakeAnalyser[] = [];

  constructor() {
    FakeAudioContext.instances = [...FakeAudioContext.instances, this];
  }
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains = [...this.gains, gain];
    return gain;
  }
  createAnalyser(): FakeAnalyser {
    const analyser = new FakeAnalyser();
    this.analysers = [...this.analysers, analyser];
    return analyser;
  }
  createMediaStreamDestination(): FakeStreamDestination {
    return new FakeStreamDestination();
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources = [...this.sources, source];
    return source;
  }
  decodeAudioData(_data: ArrayBuffer): Promise<{ duration: number }> {
    return Promise.resolve({ duration: 10 });
  }
  resume(): Promise<void> {
    this.state = "running";
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.state = "closed";
    return Promise.resolve();
  }
}

function lastContext(): FakeAudioContext {
  const ctx = FakeAudioContext.instances.at(-1);
  if (!ctx) {
    throw new Error("nenhum FakeAudioContext criado");
  }
  return ctx;
}

function lastSource(): FakeSource {
  const source = lastContext().sources.at(-1);
  if (!source) {
    throw new Error("nenhum source criado");
  }
  return source;
}

function makeFile(name = "musica.mp3", type = "audio/mpeg"): File {
  return new File([new Uint8Array(16)], name, { type });
}

async function loadedEngine(): Promise<AudioEngine> {
  const engine = new AudioEngine();
  await engine.load(makeFile());
  return engine;
}

describe("AudioEngine", () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejeita arquivo inválido com mensagem pt-BR e permanece idle", async () => {
    const engine = new AudioEngine();
    await expect(engine.load(makeFile("nota.txt", "text/plain"))).rejects.toThrow(
      "Formato não suportado",
    );
    expect(engine.getStatus()).toBe("idle");
  });

  it("load decodifica e transiciona idle→loading→ready", async () => {
    const engine = new AudioEngine();
    const statuses: PlaybackStatus[] = [];
    engine.onStatusChange((s) => statuses.push(s));
    const result = await engine.load(makeFile());
    expect(result).toEqual({ duration: 10, fileName: "musica.mp3" });
    expect(statuses).toEqual(["loading", "ready"]);
    expect(engine.getStatus()).toBe("ready");
  });

  it("configura AnalyserNode com fftSize 2048 e smoothing 0.8", async () => {
    await loadedEngine();
    const analyser = lastContext().analysers[0]!;
    expect(analyser.fftSize).toBe(FFT_SIZE);
    expect(analyser.smoothingTimeConstant).toBe(ANALYSER_SMOOTHING);
  });

  it("play/pause controlam status e tempo via currentTime do contexto", async () => {
    const engine = await loadedEngine();
    engine.play();
    expect(engine.getStatus()).toBe("playing");
    lastContext().currentTime = 3;
    expect(engine.getFrame().time).toBeCloseTo(3, 5);
    engine.pause();
    expect(engine.getStatus()).toBe("paused");
    expect(engine.getFrame().time).toBeCloseTo(3, 5);
    // retomar cria um NOVO source (one-shot) a partir do offset
    engine.play();
    expect(lastContext().sources.length).toBe(2);
    expect(lastSource().startArgs).toEqual([0, 3]);
  });

  it("seek clampa em [0, duration] e reinicia source quando tocando", async () => {
    const engine = await loadedEngine();
    engine.seek(50);
    expect(engine.getFrame().time).toBe(10);
    engine.seek(-5);
    expect(engine.getFrame().time).toBe(0);
    engine.play();
    engine.seek(4);
    expect(lastSource().startArgs).toEqual([0, 4]);
    expect(engine.getStatus()).toBe("playing");
  });

  it("fim natural transiciona para ended e notifica onEnded", async () => {
    const engine = await loadedEngine();
    const onEnded = vi.fn();
    engine.onEnded(onEnded);
    engine.play();
    lastSource().onended?.();
    expect(engine.getStatus()).toBe("ended");
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(engine.getFrame().time).toBe(10);
    // play após ended recomeça do zero
    engine.play();
    expect(lastSource().startArgs).toEqual([0, 0]);
  });

  it("pause não dispara ended (parada manual desarma onended)", async () => {
    const engine = await loadedEngine();
    const onEnded = vi.fn();
    engine.onEnded(onEnded);
    engine.play();
    const source = lastSource();
    engine.pause();
    expect(source.onended).toBeNull();
    expect(source.stopped).toBe(true);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("setVolume clampa em [0,1] e aplica no GainNode", async () => {
    const engine = await loadedEngine();
    const gain = lastContext().gains[0]!;
    engine.setVolume(2);
    expect(gain.gain.value).toBe(1);
    engine.setVolume(-1);
    expect(gain.gain.value).toBe(0);
    engine.setVolume(0.4);
    expect(gain.gain.value).toBe(0.4);
  });

  it("getFrame retorna AudioFrame completo com buffers do tamanho do contrato", async () => {
    const engine = await loadedEngine();
    engine.play();
    const frame = engine.getFrame();
    expect(frame.frequency.length).toBe(FFT_SIZE / 2);
    expect(frame.waveform.length).toBe(FFT_SIZE);
    expect(frame.level).toBe(0); // waveform silencioso (128)
    expect(frame.bands.bass).toBeGreaterThan(0); // espectro fake = 100
    expect(frame.beat).toBe(false);
    expect(frame.bpm).toBeNull();
    expect(frame.duration).toBe(10);
    // buffers internos reutilizados entre frames (documentado)
    expect(engine.getFrame().frequency).toBe(frame.frequency);
  });

  it("unsubscribe de onStatusChange para de notificar", async () => {
    const engine = new AudioEngine();
    const listener = vi.fn();
    const unsubscribe = engine.onStatusChange(listener);
    unsubscribe();
    await engine.load(makeFile());
    expect(listener).not.toHaveBeenCalled();
  });

  it("getMediaStream retorna o stream do destination de export", async () => {
    const engine = await loadedEngine();
    expect(engine.getMediaStream()).toEqual({ id: "fake-stream" });
  });

  it("dispose fecha o contexto e torna o engine inerte", async () => {
    const engine = await loadedEngine();
    engine.play();
    engine.dispose();
    expect(engine.getStatus()).toBe("idle");
    expect(lastContext().state).toBe("closed");
    engine.play(); // não deve lançar nem tocar
    expect(engine.getStatus()).toBe("idle");
    expect(() => engine.getMediaStream()).toThrow("encerrado");
  });

  it("falha de decode vira erro amigável e volta para idle", async () => {
    const engine = new AudioEngine();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(FakeAudioContext.prototype, "decodeAudioData").mockRejectedValueOnce(
      new Error("boom"),
    );
    await expect(engine.load(makeFile())).rejects.toThrow(
      "Não foi possível carregar o áudio",
    );
    expect(engine.getStatus()).toBe("idle");
    consoleError.mockRestore();
  });
});
