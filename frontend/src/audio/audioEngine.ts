/**
 * Motor de áudio (Web Audio API) — API pública conforme CONTRACTS.md.
 *
 * Grafo: AudioBufferSourceNode → GainNode → AnalyserNode → destination
 *                                                        ↘ MediaStreamAudioDestinationNode (export)
 * Source nodes são one-shot: um novo é criado a cada play/seek.
 * Controle de tempo: context.currentTime - startedAt + offset.
 *
 * NOTA (performance): getFrame() reutiliza os Uint8Array internos de
 * frequency/waveform entre chamadas — consumidores NÃO devem guardar
 * referências entre frames (copiar se precisar reter).
 */

import type { AudioFrame, PlaybackStatus } from "../shared/types";
import { computeBands, computeRms, smooth } from "./analysis";
import type { FrequencyBands } from "./analysis";
import { BeatDetector } from "./beatDetector";
import { validateAudioFile } from "./validation";

export const FFT_SIZE = 2048;
export const ANALYSER_SMOOTHING = 0.8;
/** Peso do valor novo na suavização extra das bandas por frame. */
const BAND_SMOOTHING_ALPHA = 0.5;

const LOAD_ERROR =
  "Não foi possível carregar o áudio. Verifique se o arquivo é válido.";
const UNSUPPORTED_ERROR =
  "Seu navegador não suporta reprodução de áudio (Web Audio API).";
const DISPOSED_ERROR = "O motor de áudio foi encerrado.";

interface AudioGraph {
  context: AudioContext;
  gain: GainNode;
  analyser: AnalyserNode;
  streamDestination: MediaStreamAudioDestinationNode;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;

  private status: PlaybackStatus = "idle";
  private readonly statusListeners = new Set<(s: PlaybackStatus) => void>();
  private readonly endedListeners = new Set<() => void>();

  /** Posição (s) quando pausado/parado; base do cálculo quando tocando. */
  private offset = 0;
  /** context.currentTime no instante do último start(). */
  private startedAt = 0;
  private volume = 1;

  private readonly beatDetector = new BeatDetector();
  private readonly freqData = new Uint8Array(FFT_SIZE / 2);
  private readonly waveData = new Uint8Array(FFT_SIZE).fill(128);
  private smoothedBands: FrequencyBands = { bass: 0, mid: 0, treble: 0 };
  private lastBpm: number | null = null;
  private disposed = false;

  /** Valida (mp3/wav/ogg/m4a, máx 50MB), decodifica e prepara o áudio. */
  async load(file: File): Promise<{ duration: number; fileName: string }> {
    const validation = validateAudioFile(file);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    const { context } = this.ensureGraph();
    this.stopSource();
    this.setStatus("loading");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await context.decodeAudioData(arrayBuffer);
      this.buffer = decoded;
      this.offset = 0;
      this.beatDetector.reset();
      this.lastBpm = null;
      this.smoothedBands = { bass: 0, mid: 0, treble: 0 };
      this.setStatus("ready");
      return { duration: decoded.duration, fileName: file.name };
    } catch (error: unknown) {
      this.buffer = null;
      this.setStatus("idle");
      console.error("[AudioEngine] falha ao decodificar áudio:", error);
      throw new Error(LOAD_ERROR);
    }
  }

  play(): void {
    if (this.disposed || !this.buffer || this.status === "playing") {
      return;
    }
    const { context, gain } = this.ensureGraph();
    if (this.status === "ended") {
      this.offset = 0;
      this.beatDetector.reset();
    }
    if (context.state === "suspended") {
      void context.resume().catch((error: unknown) => {
        console.error("[AudioEngine] falha ao retomar AudioContext:", error);
      });
    }
    this.startSource(context, gain);
    this.setStatus("playing");
  }

  pause(): void {
    if (this.status !== "playing") {
      return;
    }
    this.offset = this.getCurrentTime();
    this.stopSource();
    this.setStatus("paused");
  }

  seek(seconds: number): void {
    if (this.disposed || !this.buffer || !Number.isFinite(seconds)) {
      return;
    }
    const clamped = Math.min(Math.max(seconds, 0), this.buffer.duration);
    this.beatDetector.reset();
    this.offset = clamped;
    if (this.status === "playing") {
      const { context, gain } = this.ensureGraph();
      this.startSource(context, gain);
    } else if (this.status === "ended" && clamped < this.buffer.duration) {
      this.setStatus("paused");
    }
  }

  /** Volume 0-1 (clampado). */
  setVolume(v: number): void {
    if (!Number.isFinite(v)) {
      return;
    }
    this.volume = Math.min(Math.max(v, 0), 1);
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Snapshot de análise do frame corrente.
   * frequency/waveform reutilizam buffers internos (ver nota no topo).
   */
  getFrame(): AudioFrame {
    const duration = this.buffer?.duration ?? 0;
    const time = this.getCurrentTime();
    const analyser = this.analyserNode;
    const context = this.context;
    if (!analyser || !context) {
      return this.buildFrame({ beat: false, time, duration, level: 0 });
    }
    analyser.getByteFrequencyData(this.freqData);
    analyser.getByteTimeDomainData(this.waveData);
    const rawBands = computeBands(this.freqData, context.sampleRate, FFT_SIZE);
    this.smoothedBands = {
      bass: smooth(this.smoothedBands.bass, rawBands.bass, BAND_SMOOTHING_ALPHA),
      mid: smooth(this.smoothedBands.mid, rawBands.mid, BAND_SMOOTHING_ALPHA),
      treble: smooth(this.smoothedBands.treble, rawBands.treble, BAND_SMOOTHING_ALPHA),
    };
    let beat = false;
    if (this.status === "playing") {
      const result = this.beatDetector.push(rawBands.bass, time);
      beat = result.beat;
      this.lastBpm = result.bpm;
    }
    const level = computeRms(this.waveData);
    return this.buildFrame({ beat, time, duration, level });
  }

  getStatus(): PlaybackStatus {
    return this.status;
  }

  /** Registra listener de status; retorna função de unsubscribe. */
  onStatusChange(cb: (s: PlaybackStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  /** Registra listener de fim natural de playback; retorna unsubscribe. */
  onEnded(cb: () => void): () => void {
    this.endedListeners.add(cb);
    return () => {
      this.endedListeners.delete(cb);
    };
  }

  /** Stream de áudio para export (MediaStreamAudioDestinationNode). */
  getMediaStream(): MediaStream {
    return this.ensureGraph().streamDestination.stream;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.stopSource();
    this.statusListeners.clear();
    this.endedListeners.clear();
    const context = this.context;
    if (context && context.state !== "closed") {
      void context.close().catch((error: unknown) => {
        console.error("[AudioEngine] falha ao fechar AudioContext:", error);
      });
    }
    this.context = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.streamDestination = null;
    this.buffer = null;
    this.status = "idle";
    this.disposed = true;
  }

  // ---------------------------------------------------------------- privados

  private ensureGraph(): AudioGraph {
    if (this.disposed) {
      throw new Error(DISPOSED_ERROR);
    }
    if (this.context && this.gainNode && this.analyserNode && this.streamDestination) {
      return {
        context: this.context,
        gain: this.gainNode,
        analyser: this.analyserNode,
        streamDestination: this.streamDestination,
      };
    }
    const globals = globalThis as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const ContextCtor = globals.AudioContext ?? globals.webkitAudioContext;
    if (!ContextCtor) {
      throw new Error(UNSUPPORTED_ERROR);
    }
    const context = new ContextCtor();
    const gain = context.createGain();
    gain.gain.value = this.volume;
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
    const streamDestination = context.createMediaStreamDestination();
    gain.connect(analyser);
    analyser.connect(context.destination);
    analyser.connect(streamDestination);
    this.context = context;
    this.gainNode = gain;
    this.analyserNode = analyser;
    this.streamDestination = streamDestination;
    return { context, gain, analyser, streamDestination };
  }

  /** Cria e inicia um novo source (nodes são one-shot) a partir de offset. */
  private startSource(context: AudioContext, gain: GainNode): void {
    this.stopSource();
    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(gain);
    source.onended = () => {
      this.handleNaturalEnd(source);
    };
    this.startedAt = context.currentTime;
    source.start(0, this.offset);
    this.sourceNode = source;
  }

  /** Para o source ativo sem disparar "ended" (parada manual). */
  private stopSource(): void {
    const source = this.sourceNode;
    if (!source) {
      return;
    }
    this.sourceNode = null;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // já estava parado — ignorar
    }
    source.disconnect();
  }

  private handleNaturalEnd(source: AudioBufferSourceNode): void {
    if (this.sourceNode !== source) {
      return; // parada manual já tratada
    }
    this.sourceNode = null;
    this.offset = this.buffer?.duration ?? 0;
    this.setStatus("ended");
    this.endedListeners.forEach((cb) => {
      try {
        cb();
      } catch (error: unknown) {
        console.error("[AudioEngine] erro em listener de ended:", error);
      }
    });
  }

  private getCurrentTime(): number {
    if (this.status === "playing" && this.context) {
      const elapsed = this.context.currentTime - this.startedAt + this.offset;
      const duration = this.buffer?.duration ?? elapsed;
      return Math.min(Math.max(elapsed, 0), duration);
    }
    return this.offset;
  }

  private buildFrame(params: {
    beat: boolean;
    time: number;
    duration: number;
    level: number;
  }): AudioFrame {
    return {
      frequency: this.freqData,
      waveform: this.waveData,
      bands: { ...this.smoothedBands },
      level: params.level,
      beat: params.beat,
      bpm: this.lastBpm,
      time: params.time,
      duration: params.duration,
    };
  }

  private setStatus(next: PlaybackStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    this.statusListeners.forEach((cb) => {
      try {
        cb(next);
      } catch (error: unknown) {
        console.error("[AudioEngine] erro em listener de status:", error);
      }
    });
  }
}
