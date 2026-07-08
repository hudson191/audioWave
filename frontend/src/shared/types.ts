/**
 * Tipos canônicos compartilhados do audioWave.
 * Contratos definidos em CONTRACTS.md — não alterar assinaturas sem atualizar lá.
 */

/** Dados de áudio entregues a cada frame de render */
export interface AudioFrame {
  /** bins FFT (0-255), length = fftSize/2 */
  frequency: Uint8Array;
  /** time-domain (0-255), length = fftSize */
  waveform: Uint8Array;
  /** bandas normalizadas 0-1, suavizadas */
  bands: { bass: number; mid: number; treble: number };
  /** RMS 0-1 */
  level: number;
  /** true no frame em que um beat foi detectado */
  beat: boolean;
  /** estimativa corrente (null até estabilizar) */
  bpm: number | null;
  /** posição de playback em segundos */
  time: number;
  /** duração total em segundos */
  duration: number;
}

/** Paleta passada às cenas (derivada dos tokens --chart-*) */
export interface ScenePalette {
  primary: string;
  secondary: string;
  accent: string;
  /** paleta completa p/ partículas etc. */
  colors: string[];
  /** fundo do canvas */
  background: string;
}

export interface SceneContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS px (o motor cuida do DPR) */
  width: number;
  height: number;
  palette: ScenePalette;
}

/** Cena plugável. Registrada em render/sceneRegistry.ts */
export interface Scene {
  readonly id: string;
  readonly name: string;
  init(sc: SceneContext): void;
  /** chamada a cada rAF: atualiza e desenha. dt em segundos. */
  update(frame: AudioFrame, dt: number): void;
  /** re-init leve após resize (motor chama com novo SceneContext) */
  resize(sc: SceneContext): void;
  dispose(): void;
}

export interface SceneSettings {
  /** 0.1–3, default 1 */
  sensitivity: number;
  /** 0.1–2, default 1 (densidade/escala do efeito) */
  intensity: number;
  /** id do preset de paleta */
  paletteId: string;
}

export interface VisualPreset {
  id: string;
  name: string;
  sceneId: string;
  settings: SceneSettings;
}

export interface TimelineBlock {
  id: string;
  sceneId: string;
  /** segundos */
  start: number;
  /** segundos (exclusive) */
  end: number;
}

/** Projeto persistido na API */
export interface Project {
  id: string;
  name: string;
  audioFileName: string | null;
  presetId: string;
  settings: SceneSettings;
  timeline: TimelineBlock[];
  /** ISO */
  createdAt: string;
  /** ISO */
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

/** Envelope padrão de resposta da API */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended";

export type ExportStatus = "idle" | "recording" | "processing" | "done" | "error";
