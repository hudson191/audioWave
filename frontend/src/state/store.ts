/**
 * Store Zustand global do audioWave.
 * Shape conforme a seção "Store Zustand" do CONTRACTS.md.
 * Todas as ações são imutáveis (spread, nunca mutação).
 */
import { create } from "zustand";
import type {
  ExportStatus,
  PlaybackStatus,
  Project,
  ProjectInput,
  SceneSettings,
  TimelineBlock,
  VisualPreset,
} from "../shared/types";
import * as api from "../api/client";
import { isApiError } from "../api/errors";
import { insertBlock, sortBlocks } from "./timelineUtils";

export const DEFAULT_VOLUME = 0.8;
export const DEFAULT_SCENE_ID = "bars";
export const DEFAULT_SETTINGS: SceneSettings = {
  sensitivity: 1,
  intensity: 1,
  paletteId: "eyris",
  element: { x: 0, y: 0, width: 100, height: 100 },
};

export interface AppState {
  // áudio
  audioFileName: string | null;
  duration: number;
  status: PlaybackStatus;
  currentTime: number;
  volume: number;
  // visual
  sceneId: string;
  settings: SceneSettings;
  presets: VisualPreset[];
  // timeline
  timeline: TimelineBlock[];
  // projeto
  project: Project | null;
  projects: Project[];
  // export
  exportStatus: ExportStatus;
  exportProgress: number; // 0-1
  // imagens (object URLs de sessão — não persistidas nem salvas no projeto)
  backgroundImageUrl: string | null;
  centerImageUrl: string | null;
  // erros de UI (mensagem amigável pt-BR)
  error: string | null;

  // ações síncronas
  setStatus: (status: PlaybackStatus) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setAudioFileName: (name: string | null) => void;
  setVolume: (volume: number) => void;
  setScene: (sceneId: string) => void;
  setSettings: (partial: Partial<SceneSettings>) => void;
  applyPreset: (preset: VisualPreset) => void;
  setTimeline: (blocks: TimelineBlock[]) => void;
  addTimelineBlock: (block: TimelineBlock) => void;
  updateTimelineBlock: (
    id: string,
    partial: Partial<Omit<TimelineBlock, "id">>,
  ) => void;
  removeTimelineBlock: (id: string) => void;
  setExportStatus: (status: ExportStatus) => void;
  setExportProgress: (progress: number) => void;
  setBackgroundImageUrl: (url: string | null) => void;
  setCenterImageUrl: (url: string | null) => void;
  clearError: () => void;

  // ações async
  loadPresets: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  saveProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toFriendlyMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message;
  }
  console.error("[store] erro inesperado", error);
  return fallback;
}

function upsertProject(projects: readonly Project[], saved: Project): Project[] {
  const exists = projects.some((p) => p.id === saved.id);
  return exists
    ? projects.map((p) => (p.id === saved.id ? saved : p))
    : [...projects, saved];
}

function buildProjectInput(state: AppState, name: string): ProjectInput {
  // A cena corrente manda: o presetId do projeto carregado pode estar
  // obsoleto se o usuário trocou de cena/preset depois de abrir o projeto.
  const presetId =
    state.presets.find((p) => p.sceneId === state.sceneId)?.id ??
    state.project?.presetId ??
    state.sceneId;
  return {
    name,
    audioFileName: state.audioFileName,
    presetId,
    settings: { ...state.settings },
    timeline: state.timeline.map((block) => ({ ...block })),
  };
}

export const useAppStore = create<AppState>()((set, get) => ({
  audioFileName: null,
  duration: 0,
  status: "idle",
  currentTime: 0,
  volume: DEFAULT_VOLUME,
  sceneId: DEFAULT_SCENE_ID,
  settings: { ...DEFAULT_SETTINGS },
  presets: [],
  timeline: [],
  project: null,
  projects: [],
  exportStatus: "idle",
  exportProgress: 0,
  backgroundImageUrl: null,
  centerImageUrl: null,
  error: null,

  setStatus: (status) => set({ status }),

  setCurrentTime: (time) => {
    const { duration } = get();
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    set({ currentTime: clamp(time, 0, max) });
  },

  setDuration: (duration) => set({ duration: Math.max(0, duration) }),

  setAudioFileName: (name) => set({ audioFileName: name }),

  setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),

  setScene: (sceneId) => set({ sceneId }),

  setSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  // Preset define o LOOK (cena/paleta/sensibilidade); a caixa do elemento é
  // layout do usuário e é preservada quando o preset não define uma.
  applyPreset: (preset) =>
    set((state) => ({
      sceneId: preset.sceneId,
      settings: {
        ...preset.settings,
        element: preset.settings.element ?? state.settings.element,
      },
    })),

  setTimeline: (blocks) => set({ timeline: sortBlocks(blocks) }),

  addTimelineBlock: (block) => {
    const result = insertBlock(get().timeline, block);
    if (!result.ok) {
      set({ error: result.error });
      return;
    }
    set({ timeline: result.timeline, error: null });
  },

  updateTimelineBlock: (id, partial) => {
    const current = get().timeline.find((block) => block.id === id);
    if (!current) {
      set({ error: "Bloco da timeline não encontrado." });
      return;
    }
    const updated: TimelineBlock = { ...current, ...partial, id };
    const result = insertBlock(get().timeline, updated);
    if (!result.ok) {
      set({ error: result.error });
      return;
    }
    set({ timeline: result.timeline, error: null });
  },

  removeTimelineBlock: (id) =>
    set((state) => ({
      timeline: state.timeline.filter((block) => block.id !== id),
    })),

  setExportStatus: (exportStatus) => set({ exportStatus }),

  setExportProgress: (progress) =>
    set({ exportProgress: clamp(progress, 0, 1) }),

  setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),

  setCenterImageUrl: (url) => set({ centerImageUrl: url }),

  clearError: () => set({ error: null }),

  // Nas ações async, o erro global é limpo no INÍCIO da ação (nunca no
  // sucesso): limpar no sucesso apagaria o erro de uma ação concorrente
  // (ex.: loadPresets falha e loadProjects resolve depois no boot).
  loadPresets: async () => {
    set({ error: null });
    try {
      const presets = await api.getPresets();
      set({ presets });
    } catch (error: unknown) {
      set({
        error: toFriendlyMessage(error, "Não foi possível carregar os presets."),
      });
    }
  },

  loadProjects: async () => {
    set({ error: null });
    try {
      const projects = await api.getProjects();
      set({ projects });
    } catch (error: unknown) {
      set({
        error: toFriendlyMessage(
          error,
          "Não foi possível carregar os projetos.",
        ),
      });
    }
  },

  loadProject: async (id) => {
    set({ error: null });
    try {
      const project = await api.getProject(id);
      const preset = get().presets.find((p) => p.id === project.presetId);
      const sceneId =
        preset?.sceneId ?? project.timeline[0]?.sceneId ?? get().sceneId;
      set({
        project,
        audioFileName: project.audioFileName,
        sceneId,
        settings: { ...project.settings },
        timeline: sortBlocks(project.timeline),
      });
    } catch (error: unknown) {
      set({
        error: toFriendlyMessage(error, "Não foi possível abrir o projeto."),
      });
    }
  },

  saveProject: async (name) => {
    set({ error: null });
    const trimmed = name.trim();
    if (!trimmed) {
      set({ error: "Informe um nome para o projeto." });
      return;
    }
    const state = get();
    const input = buildProjectInput(state, trimmed);
    try {
      const saved = state.project
        ? await api.updateProject(state.project.id, input)
        : await api.createProject(input);
      set((s) => ({
        project: saved,
        projects: upsertProject(s.projects, saved),
      }));
    } catch (error: unknown) {
      set({
        error: toFriendlyMessage(error, "Não foi possível salvar o projeto."),
      });
    }
  },

  deleteProject: async (id) => {
    set({ error: null });
    try {
      await api.deleteProject(id);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        project: s.project?.id === id ? null : s.project,
      }));
    } catch (error: unknown) {
      set({
        error: toFriendlyMessage(error, "Não foi possível excluir o projeto."),
      });
    }
  },
}));
