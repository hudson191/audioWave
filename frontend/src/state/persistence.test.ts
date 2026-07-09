import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_DEBOUNCE_MS,
  initPersistence,
  loadEditorState,
  parsePersisted,
  PERSIST_VERSION,
  saveEditorState,
  STORAGE_KEY,
} from "./persistence";
import { useAppStore } from "./store";

vi.mock("../api/client", () => ({
  getPresets: vi.fn(),
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const initialState = useAppStore.getState();

const snapshot = {
  sceneId: "particles",
  settings: { sensitivity: 2, intensity: 1.5, paletteId: "neon" },
  timeline: [{ id: "a", sceneId: "bars", start: 0, end: 10 }],
  volume: 0.5,
};

let cleanup: (() => void) | null = null;

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState(initialState, true);
});

afterEach(() => {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  vi.useRealTimers();
});

describe("saveEditorState / loadEditorState", () => {
  it("roundtrip preserva o snapshot com versão", () => {
    saveEditorState(snapshot);
    expect(loadEditorState()).toEqual({
      version: PERSIST_VERSION,
      ...snapshot,
    });
  });

  it("sem dado salvo retorna null", () => {
    expect(loadEditorState()).toBeNull();
  });
});

describe("parsePersisted — parse defensivo", () => {
  it("JSON corrompido retorna null", () => {
    expect(parsePersisted("{not json")).toBeNull();
  });

  it("null/vazio retorna null", () => {
    expect(parsePersisted(null)).toBeNull();
    expect(parsePersisted("")).toBeNull();
  });

  it("versão desconhecida retorna null", () => {
    const raw = JSON.stringify({ ...snapshot, version: 999 });
    expect(parsePersisted(raw)).toBeNull();
  });

  it("payload que não é objeto retorna null", () => {
    expect(parsePersisted(JSON.stringify("string"))).toBeNull();
    expect(parsePersisted(JSON.stringify([1, 2]))).toBeNull();
  });

  it("settings inválidos retornam null", () => {
    const raw = JSON.stringify({
      ...snapshot,
      version: PERSIST_VERSION,
      settings: { sensitivity: "alta" },
    });
    expect(parsePersisted(raw)).toBeNull();
  });

  it("settings fora dos ranges do contrato retornam null", () => {
    const outOfRange = [
      { sensitivity: 9999, intensity: 1, paletteId: "neon" },
      { sensitivity: 0.05, intensity: 1, paletteId: "neon" },
      { sensitivity: 1, intensity: -50, paletteId: "neon" },
      { sensitivity: 1, intensity: 2.5, paletteId: "neon" },
    ];
    for (const settings of outOfRange) {
      const raw = JSON.stringify({
        ...snapshot,
        version: PERSIST_VERSION,
        settings,
      });
      expect(parsePersisted(raw)).toBeNull();
    }
  });

  it("timeline com start negativo ou end <= start retorna null", () => {
    const invalidBlocks = [
      [{ id: "a", sceneId: "bars", start: -1, end: 10 }],
      [{ id: "a", sceneId: "bars", start: 5, end: 2 }],
      [{ id: "a", sceneId: "bars", start: 5, end: 5 }],
    ];
    for (const timeline of invalidBlocks) {
      const raw = JSON.stringify({
        ...snapshot,
        version: PERSIST_VERSION,
        timeline,
      });
      expect(parsePersisted(raw)).toBeNull();
    }
  });

  it("timeline com bloco malformado retorna null", () => {
    const raw = JSON.stringify({
      ...snapshot,
      version: PERSIST_VERSION,
      timeline: [{ id: "a", start: 0 }],
    });
    expect(parsePersisted(raw)).toBeNull();
  });

  it("volume fora de [0,1] retorna null", () => {
    const raw = JSON.stringify({
      ...snapshot,
      version: PERSIST_VERSION,
      volume: 3,
    });
    expect(parsePersisted(raw)).toBeNull();
  });

  it("payload válido retorna cópias novas (imutável)", () => {
    const raw = JSON.stringify({ ...snapshot, version: PERSIST_VERSION });
    const a = parsePersisted(raw);
    const b = parsePersisted(raw);
    expect(a).toEqual(b);
    expect(a?.settings).not.toBe(b?.settings);
    expect(a?.timeline).not.toBe(b?.timeline);
  });
});

describe("initPersistence", () => {
  it("restaura snapshot persistido no store", () => {
    saveEditorState(snapshot);
    cleanup = initPersistence(useAppStore);
    const s = useAppStore.getState();
    expect(s.sceneId).toBe("particles");
    expect(s.settings).toEqual(snapshot.settings);
    expect(s.timeline).toEqual(snapshot.timeline);
    expect(s.volume).toBe(0.5);
  });

  it("com localStorage corrompido mantém defaults", () => {
    window.localStorage.setItem(STORAGE_KEY, "%%%corrompido%%%");
    cleanup = initPersistence(useAppStore);
    const s = useAppStore.getState();
    expect(s.sceneId).toBe("bars");
    expect(s.volume).toBe(0.8);
  });

  it("autosave grava após o debounce de 500ms", () => {
    vi.useFakeTimers();
    cleanup = initPersistence(useAppStore);

    useAppStore.getState().setVolume(0.3);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(1);
    const saved = loadEditorState();
    expect(saved?.volume).toBe(0.3);
    expect(saved?.sceneId).toBe("bars");
  });

  it("mudanças rápidas geram uma única gravação com o estado final", () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(Storage.prototype, "setItem");
    cleanup = initPersistence(useAppStore);

    useAppStore.getState().setVolume(0.1);
    vi.advanceTimersByTime(200);
    useAppStore.getState().setScene("waveform");
    vi.advanceTimersByTime(200);
    useAppStore.getState().setVolume(0.9);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

    expect(spy).toHaveBeenCalledTimes(1);
    const saved = loadEditorState();
    expect(saved?.volume).toBe(0.9);
    expect(saved?.sceneId).toBe("waveform");
    spy.mockRestore();
  });

  it("mudanças fora do slice persistido não disparam autosave", () => {
    vi.useFakeTimers();
    cleanup = initPersistence(useAppStore);

    useAppStore.getState().setCurrentTime(12);
    useAppStore.getState().setStatus("playing");
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("cleanup cancela autosave pendente e unsubscribe", () => {
    vi.useFakeTimers();
    const dispose = initPersistence(useAppStore);

    useAppStore.getState().setVolume(0.2);
    dispose();
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    useAppStore.getState().setVolume(0.6);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("settings.element persistido", () => {
  const base = {
    version: 1,
    sceneId: "bars",
    settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
    timeline: [],
    volume: 0.8,
  };

  it("aceita payload sem element (retrocompatível)", () => {
    expect(parsePersisted(JSON.stringify(base))).not.toBeNull();
  });

  it("aceita element válido e o preserva", () => {
    const payload = {
      ...base,
      settings: {
        ...base.settings,
        element: { x: 10, y: 20, width: 50, height: 40 },
      },
    };
    const parsed = parsePersisted(JSON.stringify(payload));
    expect(parsed?.settings.element).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 40,
    });
  });

  it("rejeita element fora dos ranges do contrato", () => {
    const payload = {
      ...base,
      settings: {
        ...base.settings,
        element: { x: -5, y: 0, width: 50, height: 50 },
      },
    };
    expect(parsePersisted(JSON.stringify(payload))).toBeNull();
  });

  it("rejeita element com tamanho abaixo do mínimo", () => {
    const payload = {
      ...base,
      settings: {
        ...base.settings,
        element: { x: 0, y: 0, width: 1, height: 50 },
      },
    };
    expect(parsePersisted(JSON.stringify(payload))).toBeNull();
  });
});
