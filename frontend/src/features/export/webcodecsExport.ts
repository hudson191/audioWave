/**
 * Export RÁPIDO (offline) com WebCodecs + mp4-muxer.
 *
 * Renderiza quadro a quadro SEM tocar o áudio: a análise vem do PCM (FFT
 * offline) e as cenas são desenhadas na resolução alvo e encodadas com
 * VideoEncoder (H.264). O áudio é encodado com AudioEncoder (AAC) a partir
 * do mesmo PCM. Roda tão rápido quanto a CPU encoda — bem acima de 1x.
 */
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import type { SceneSettings, TimelineBlock } from "../../shared/types";
import { createOfflineFrameSource, extractMono } from "../../audio";
import { OfflineRenderer, getPalette } from "../../render";
import { sceneIdAt } from "../../state";
import {
  computeVideoBitrate,
  frameTimestampMicros,
} from "./exportUtils";

/** Candidatos de codec H.264 (High, depois Baseline como fallback). */
const H264_CODECS = ["avc1.640028", "avc1.42001f", "avc1.42e01e"];
const AAC_CODEC = "mp4a.40.2";
const AUDIO_BITRATE = 192_000;
const AUDIO_CHUNK_FRAMES = 4096;
/** Limite da fila do encoder antes de aplicar backpressure. */
const MAX_QUEUE = 12;

export interface FastExportParams {
  audioBuffer: AudioBuffer;
  width: number;
  height: number;
  fps: number;
  sceneId: string;
  settings: SceneSettings;
  timeline: readonly TimelineBlock[];
  backgroundImage: HTMLImageElement | null;
  centerImage: HTMLImageElement | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Erro de export cancelado pelo usuário. */
export class ExportCancelledError extends Error {
  constructor() {
    super("Exportação cancelada.");
    this.name = "ExportCancelledError";
  }
}

/** Escolhe o primeiro codec H.264 suportado na resolução/fps dados. */
async function pickVideoCodec(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<string> {
  for (const codec of H264_CODECS) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) {
        return codec;
      }
    } catch {
      // tenta o próximo
    }
  }
  throw new Error(
    "Nenhum codec H.264 suportado para exportação neste navegador.",
  );
}

/** Aguarda a fila do encoder baixar (backpressure), respeitando o cancelamento. */
async function drainQueue(
  encoder: VideoEncoder,
  signal?: AbortSignal,
): Promise<void> {
  while (encoder.encodeQueueSize > MAX_QUEUE) {
    if (signal?.aborted) {
      throw new ExportCancelledError();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ExportCancelledError();
  }
}

/** Encoda a trilha de áudio (AAC) a partir do PCM decodificado. */
function encodeAudio(
  encoder: AudioEncoder,
  buffer: AudioBuffer,
): void {
  const { numberOfChannels, sampleRate, length } = buffer;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numberOfChannels; ch += 1) {
    channels.push(buffer.getChannelData(ch));
  }
  for (let offset = 0; offset < length; offset += AUDIO_CHUNK_FRAMES) {
    const frames = Math.min(AUDIO_CHUNK_FRAMES, length - offset);
    // f32-planar: canais concatenados num único Float32Array
    const planar = new Float32Array(frames * numberOfChannels);
    for (let ch = 0; ch < numberOfChannels; ch += 1) {
      planar.set(
        channels[ch]!.subarray(offset, offset + frames),
        ch * frames,
      );
    }
    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000),
      data: planar,
    });
    encoder.encode(audioData);
    audioData.close();
  }
}

/** Fábrica de canvas para o OfflineRenderer (canvas destacado). */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Executa o export rápido e devolve um Blob MP4. Lança ExportCancelledError
 * se `signal` for abortado.
 */
export async function exportWithWebCodecs(
  params: FastExportParams,
): Promise<Blob> {
  const { audioBuffer, width, height, fps, signal } = params;
  const bitrate = computeVideoBitrate(width, height, fps);
  const codec = await pickVideoCodec(width, height, fps, bitrate);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height },
    audio: {
      codec: "aac",
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });
  videoEncoder.configure({ codec, width, height, bitrate, framerate: fps });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });
  audioEncoder.configure({
    codec: AAC_CODEC,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    bitrate: AUDIO_BITRATE,
  });

  const renderer = new OfflineRenderer({
    width,
    height,
    palette: getPalette(params.settings.paletteId),
    settings: params.settings,
    createCanvas,
  });
  renderer.setBackgroundImage(params.backgroundImage);
  renderer.setCenterImage(params.centerImage);

  try {
    // Áudio inteiro na fila primeiro (encoda em paralelo com o vídeo).
    encodeAudio(audioEncoder, audioBuffer);

    const mono = extractMono(audioBuffer);
    const frames = createOfflineFrameSource(mono, audioBuffer.sampleRate, fps);
    const total = frames.totalFrames;
    const dt = 1 / fps;
    const frameDuration = Math.round(1_000_000 / fps);
    const keyInterval = Math.max(1, Math.round(fps * 2)); // keyframe a cada 2s

    for (let i = 0; i < total; i += 1) {
      throwIfAborted(signal);
      const frame = frames.next();
      const activeScene = sceneIdAt(params.timeline, frame.time, params.sceneId);
      renderer.setScene(activeScene);
      renderer.renderFrame(frame, dt);

      const videoFrame = new VideoFrame(renderer.canvas, {
        timestamp: frameTimestampMicros(i, fps),
        duration: frameDuration,
      });
      videoEncoder.encode(videoFrame, { keyFrame: i % keyInterval === 0 });
      videoFrame.close();

      await drainQueue(videoEncoder, signal);
      params.onProgress?.((i + 1) / total);
    }

    await videoEncoder.flush();
    await audioEncoder.flush();
    muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    renderer.dispose();
    if (videoEncoder.state !== "closed") videoEncoder.close();
    if (audioEncoder.state !== "closed") audioEncoder.close();
  }
}
