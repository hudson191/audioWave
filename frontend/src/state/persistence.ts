/**
 * Persistência do estado do editor em localStorage.
 * Payload versionado + parse defensivo (dados corrompidos → null).
 * initPersistence(store) restaura o snapshot e liga autosave com debounce.
 */
import type { StoreApi } from "zustand";
import type { SceneSettings, TimelineBlock } from "../shared/types";
import type { AppState } from "./store";

export const STORAGE_KEY = "audiowave:editor";
export const PERSIST_VERSION = 1;
export const AUTOSAVE_DEBOUNCE_MS = 500;

export interface PersistedEditorState {
  version: number;
  sceneId: string;
  settings: SceneSettings;
  timeline: TimelineBlock[];
  volume: number;
}

type EditorSnapshot = Omit<PersistedEditorState, "version">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Ranges do contrato (CONTRACTS.md), iguais aos do Zod da API. */
const SENSITIVITY_RANGE = { min: 0.1, max: 3 } as const;
const INTENSITY_RANGE = { min: 0.1, max: 2 } as const;
const ELEMENT_POS_RANGE = { min: 0, max: 100 } as const;
const ELEMENT_SIZE_RANGE = { min: 5, max: 100 } as const;

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

/** Caixa do elemento é opcional; presente, precisa estar nos ranges. */
function isValidElement(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    inRange(value.x, ELEMENT_POS_RANGE) &&
    isFiniteNumber(value.y) &&
    inRange(value.y, ELEMENT_POS_RANGE) &&
    isFiniteNumber(value.width) &&
    inRange(value.width, ELEMENT_SIZE_RANGE) &&
    isFiniteNumber(value.height) &&
    inRange(value.height, ELEMENT_SIZE_RANGE)
  );
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** customColors é opcional; presente, deve ser lista de cores hex válidas. */
function isValidCustomColors(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    Array.isArray(value) &&
    value.every((c) => typeof c === "string" && HEX_COLOR_RE.test(c))
  );
}

function isSceneSettings(value: unknown): value is SceneSettings {
  return (
    isRecord(value) &&
    isFiniteNumber(value.sensitivity) &&
    inRange(value.sensitivity, SENSITIVITY_RANGE) &&
    isFiniteNumber(value.intensity) &&
    inRange(value.intensity, INTENSITY_RANGE) &&
    typeof value.paletteId === "string" &&
    isValidElement(value.element) &&
    isValidCustomColors(value.customColors)
  );
}

function isTimelineBlock(value: unknown): value is TimelineBlock {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sceneId === "string" &&
    isFiniteNumber(value.start) &&
    isFiniteNumber(value.end) &&
    value.start >= 0 &&
    value.end > value.start
  );
}

/** Parse defensivo do payload bruto; qualquer inconsistência retorna null. */
export function parsePersisted(raw: string | null): PersistedEditorState | null {
  if (raw === null || raw === "") {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.version !== PERSIST_VERSION) return null;
  if (typeof parsed.sceneId !== "string" || parsed.sceneId === "") return null;
  if (!isSceneSettings(parsed.settings)) return null;
  if (!Array.isArray(parsed.timeline)) return null;
  if (!parsed.timeline.every(isTimelineBlock)) return null;
  if (!isFiniteNumber(parsed.volume)) return null;
  if (parsed.volume < 0 || parsed.volume > 1) return null;
  return {
    version: PERSIST_VERSION,
    sceneId: parsed.sceneId,
    settings: { ...parsed.settings },
    timeline: parsed.timeline.map((block) => ({ ...block })),
    volume: parsed.volume,
  };
}

/** Lê o snapshot salvo; corrompido/indisponível → null. */
export function loadEditorState(): PersistedEditorState | null {
  try {
    return parsePersisted(window.localStorage.getItem(STORAGE_KEY));
  } catch (error: unknown) {
    console.error("[persistence] falha ao ler localStorage", error);
    return null;
  }
}

/** Grava o snapshot corrente (falha de quota/acesso é apenas logada). */
export function saveEditorState(snapshot: EditorSnapshot): void {
  try {
    const payload: PersistedEditorState = {
      version: PERSIST_VERSION,
      ...snapshot,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error: unknown) {
    console.error("[persistence] falha ao gravar localStorage", error);
  }
}

function snapshotOf(state: AppState): EditorSnapshot {
  return {
    sceneId: state.sceneId,
    settings: state.settings,
    timeline: state.timeline,
    volume: state.volume,
  };
}

function snapshotChanged(next: AppState, prev: AppState): boolean {
  return (
    next.sceneId !== prev.sceneId ||
    next.settings !== prev.settings ||
    next.timeline !== prev.timeline ||
    next.volume !== prev.volume
  );
}

/**
 * Restaura o estado persistido no store e ativa autosave (debounce 500ms)
 * de sceneId/settings/timeline/volume. Retorna função de cleanup.
 */
export function initPersistence(store: StoreApi<AppState>): () => void {
  const persisted = loadEditorState();
  if (persisted) {
    store.setState({
      sceneId: persisted.sceneId,
      settings: persisted.settings,
      timeline: persisted.timeline,
      volume: persisted.volume,
    });
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = store.subscribe((state, prev) => {
    if (!snapshotChanged(state, prev)) {
      return;
    }
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      saveEditorState(snapshotOf(store.getState()));
    }, AUTOSAVE_DEBOUNCE_MS);
  });

  return () => {
    unsubscribe();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
