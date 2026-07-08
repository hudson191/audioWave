/**
 * Tipos da API duplicados do contrato canônico (CONTRACTS.md /
 * frontend/src/shared/types.ts). A API não importa do frontend, então as
 * formas são replicadas aqui e verificadas estruturalmente pelos schemas Zod.
 */

/** Envelope padrão de resposta da API */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
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

/** Projeto persistido pela API */
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

/**
 * Atualização parcial de projeto (PUT /api/projects/:id).
 * `| undefined` explícito por causa de exactOptionalPropertyTypes:
 * é o shape que o Zod `.partial()` produz.
 */
export type ProjectPatch = {
  [K in keyof ProjectInput]?: ProjectInput[K] | undefined;
};
