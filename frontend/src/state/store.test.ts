import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, TimelineBlock, VisualPreset } from "../shared/types";
import { ApiError } from "../api/errors";
import * as api from "../api/client";
import {
  DEFAULT_SCENE_ID,
  DEFAULT_SETTINGS,
  DEFAULT_VOLUME,
  useAppStore,
} from "./store";

vi.mock("../api/client", () => ({
  getPresets: vi.fn(),
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const initialState = useAppStore.getState();

const preset: VisualPreset = {
  id: "eyris-particles",
  name: "Partículas Eyris",
  sceneId: "particles",
  settings: { sensitivity: 2, intensity: 1.5, paletteId: "neon" },
};

const project: Project = {
  id: "p1",
  name: "Demo",
  audioFileName: "track.mp3",
  presetId: "eyris-particles",
  settings: { sensitivity: 0.5, intensity: 0.7, paletteId: "sunset" },
  timeline: [
    { id: "t2", sceneId: "waveform", start: 10, end: 20 },
    { id: "t1", sceneId: "bars", start: 0, end: 10 },
  ],
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

function block(id: string, start: number, end: number): TimelineBlock {
  return { id, sceneId: "bars", start, end };
}

beforeEach(() => {
  useAppStore.setState(initialState, true);
  vi.clearAllMocks();
});

describe("defaults", () => {
  it("tem os valores iniciais do contrato", () => {
    const s = useAppStore.getState();
    expect(s.volume).toBe(DEFAULT_VOLUME);
    expect(s.volume).toBe(0.8);
    expect(s.sceneId).toBe(DEFAULT_SCENE_ID);
    expect(s.sceneId).toBe("bars");
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.settings).toEqual({
      sensitivity: 1,
      intensity: 1,
      paletteId: "eyris",
      element: { x: 0, y: 0, width: 100, height: 100 },
    });
    expect(s.exportStatus).toBe("idle");
    expect(s.status).toBe("idle");
    expect(s.timeline).toEqual([]);
    expect(s.error).toBeNull();
  });
});

describe("ações síncronas", () => {
  it("setVolume clampa em [0,1]", () => {
    useAppStore.getState().setVolume(1.5);
    expect(useAppStore.getState().volume).toBe(1);
    useAppStore.getState().setVolume(-0.3);
    expect(useAppStore.getState().volume).toBe(0);
  });

  it("setCurrentTime clampa em [0, duration]", () => {
    useAppStore.getState().setDuration(60);
    useAppStore.getState().setCurrentTime(75);
    expect(useAppStore.getState().currentTime).toBe(60);
    useAppStore.getState().setCurrentTime(-2);
    expect(useAppStore.getState().currentTime).toBe(0);
  });

  it("setSettings mescla parcialmente sem mutar o objeto anterior", () => {
    const before = useAppStore.getState().settings;
    useAppStore.getState().setSettings({ sensitivity: 2.5 });
    const after = useAppStore.getState().settings;
    expect(after).toEqual({
      sensitivity: 2.5,
      intensity: 1,
      paletteId: "eyris",
      element: { x: 0, y: 0, width: 100, height: 100 },
    });
    expect(before.sensitivity).toBe(1);
    expect(after).not.toBe(before);
  });

  it("applyPreset aplica sceneId e cópia dos settings", () => {
    useAppStore.getState().applyPreset(preset);
    const s = useAppStore.getState();
    expect(s.sceneId).toBe("particles");
    // preset sem element: preserva a caixa do elemento corrente (layout)
    expect(s.settings).toEqual({
      ...preset.settings,
      element: { x: 0, y: 0, width: 100, height: 100 },
    });
    expect(s.settings).not.toBe(preset.settings);
  });

  it("setStatus / setAudioFileName / setExportProgress funcionam", () => {
    useAppStore.getState().setStatus("playing");
    useAppStore.getState().setAudioFileName("song.wav");
    useAppStore.getState().setExportProgress(1.7);
    const s = useAppStore.getState();
    expect(s.status).toBe("playing");
    expect(s.audioFileName).toBe("song.wav");
    expect(s.exportProgress).toBe(1);
  });
});

describe("timeline", () => {
  it("addTimelineBlock mantém ordenação por start", () => {
    useAppStore.getState().addTimelineBlock(block("b", 10, 20));
    useAppStore.getState().addTimelineBlock(block("a", 0, 5));
    expect(useAppStore.getState().timeline.map((x) => x.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("addTimelineBlock rejeita overlap com erro amigável e não altera a timeline", () => {
    useAppStore.getState().addTimelineBlock(block("a", 0, 10));
    const before = useAppStore.getState().timeline;
    useAppStore.getState().addTimelineBlock(block("b", 5, 15));
    const s = useAppStore.getState();
    expect(s.timeline).toBe(before);
    expect(s.error).toBe(
      "Este bloco sobrepõe outro bloco da timeline. Ajuste os tempos.",
    );
  });

  it("updateTimelineBlock move bloco e reordena", () => {
    useAppStore.getState().addTimelineBlock(block("a", 0, 10));
    useAppStore.getState().addTimelineBlock(block("b", 20, 30));
    useAppStore.getState().updateTimelineBlock("a", { start: 40, end: 50 });
    expect(useAppStore.getState().timeline.map((x) => x.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("updateTimelineBlock rejeita mover para cima de outro bloco", () => {
    useAppStore.getState().addTimelineBlock(block("a", 0, 10));
    useAppStore.getState().addTimelineBlock(block("b", 20, 30));
    useAppStore.getState().updateTimelineBlock("a", { start: 25, end: 35 });
    const s = useAppStore.getState();
    expect(s.timeline.find((x) => x.id === "a")).toEqual(block("a", 0, 10));
    expect(s.error).toMatch(/sobrepõe/);
  });

  it("updateTimelineBlock com id inexistente seta erro", () => {
    useAppStore.getState().updateTimelineBlock("ghost", { start: 0 });
    expect(useAppStore.getState().error).toBe(
      "Bloco da timeline não encontrado.",
    );
  });

  it("removeTimelineBlock remove pelo id", () => {
    useAppStore.getState().addTimelineBlock(block("a", 0, 10));
    useAppStore.getState().removeTimelineBlock("a");
    expect(useAppStore.getState().timeline).toEqual([]);
  });

  it("clearError limpa a mensagem", () => {
    useAppStore.getState().updateTimelineBlock("ghost", {});
    useAppStore.getState().clearError();
    expect(useAppStore.getState().error).toBeNull();
  });
});

describe("ações async", () => {
  it("loadPresets popula presets", async () => {
    vi.mocked(api.getPresets).mockResolvedValue([preset]);
    await useAppStore.getState().loadPresets();
    expect(useAppStore.getState().presets).toEqual([preset]);
    expect(useAppStore.getState().error).toBeNull();
  });

  it("loadPresets com ApiError expõe a mensagem amigável", async () => {
    vi.mocked(api.getPresets).mockRejectedValue(
      new ApiError("Não foi possível conectar ao servidor"),
    );
    await useAppStore.getState().loadPresets();
    expect(useAppStore.getState().error).toBe(
      "Não foi possível conectar ao servidor",
    );
  });

  it("loadProjects popula projects", async () => {
    vi.mocked(api.getProjects).mockResolvedValue([project]);
    await useAppStore.getState().loadProjects();
    expect(useAppStore.getState().projects).toEqual([project]);
  });

  it("loadProject aplica settings, timeline ordenada e cena do preset", async () => {
    useAppStore.setState({ presets: [preset] });
    vi.mocked(api.getProject).mockResolvedValue(project);
    await useAppStore.getState().loadProject("p1");
    const s = useAppStore.getState();
    expect(s.project).toEqual(project);
    expect(s.audioFileName).toBe("track.mp3");
    expect(s.settings).toEqual(project.settings);
    expect(s.timeline.map((x) => x.id)).toEqual(["t1", "t2"]);
    expect(s.sceneId).toBe("particles");
  });

  it("saveProject cria projeto novo com o estado atual", async () => {
    vi.mocked(api.createProject).mockResolvedValue(project);
    useAppStore.setState({
      audioFileName: "track.mp3",
      presets: [preset],
      sceneId: "particles",
    });
    await useAppStore.getState().saveProject("  Demo  ");
    expect(api.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Demo",
        audioFileName: "track.mp3",
        presetId: "eyris-particles",
      }),
    );
    const s = useAppStore.getState();
    expect(s.project).toEqual(project);
    expect(s.projects).toEqual([project]);
  });

  it("saveProject prioriza o preset da cena corrente sobre o presetId do projeto aberto", async () => {
    const waveformPreset: VisualPreset = {
      id: "eyris-waveform",
      name: "Waveform Eyris",
      sceneId: "waveform",
      settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
    };
    vi.mocked(api.updateProject).mockResolvedValue(project);
    // projeto aberto aponta para "eyris-particles", mas o usuário trocou a cena
    useAppStore.setState({
      project,
      projects: [project],
      presets: [preset, waveformPreset],
      sceneId: "waveform",
    });
    await useAppStore.getState().saveProject("Demo");
    expect(api.updateProject).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ presetId: "eyris-waveform" }),
    );
  });

  it("saveProject mantém o presetId do projeto quando nenhum preset cobre a cena", async () => {
    vi.mocked(api.updateProject).mockResolvedValue(project);
    useAppStore.setState({
      project,
      projects: [project],
      presets: [],
      sceneId: "waveform",
    });
    await useAppStore.getState().saveProject("Demo");
    expect(api.updateProject).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ presetId: "eyris-particles" }),
    );
  });

  it("saveProject atualiza projeto existente", async () => {
    const updated = { ...project, name: "Renomeado" };
    vi.mocked(api.updateProject).mockResolvedValue(updated);
    useAppStore.setState({ project, projects: [project] });
    await useAppStore.getState().saveProject("Renomeado");
    expect(api.updateProject).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ name: "Renomeado", presetId: project.presetId }),
    );
    const s = useAppStore.getState();
    expect(s.project).toEqual(updated);
    expect(s.projects).toEqual([updated]);
  });

  it("saveProject com nome vazio seta erro e não chama a API", async () => {
    await useAppStore.getState().saveProject("   ");
    expect(useAppStore.getState().error).toBe(
      "Informe um nome para o projeto.",
    );
    expect(api.createProject).not.toHaveBeenCalled();
  });

  it("saveProject com falha da API expõe erro", async () => {
    vi.mocked(api.createProject).mockRejectedValue(
      new ApiError("Erro interno do servidor. Tente novamente mais tarde.", 500),
    );
    await useAppStore.getState().saveProject("Demo");
    expect(useAppStore.getState().error).toBe(
      "Erro interno do servidor. Tente novamente mais tarde.",
    );
  });

  it("deleteProject remove da lista e limpa projeto corrente", async () => {
    vi.mocked(api.deleteProject).mockResolvedValue(undefined);
    useAppStore.setState({ project, projects: [project] });
    await useAppStore.getState().deleteProject("p1");
    const s = useAppStore.getState();
    expect(s.projects).toEqual([]);
    expect(s.project).toBeNull();
  });

  it("sucesso de uma ação concorrente não apaga o erro de outra (boot)", async () => {
    // /api/presets falha rápido; /api/projects resolve depois
    vi.mocked(api.getPresets).mockRejectedValue(
      new ApiError("Não foi possível conectar ao servidor"),
    );
    let resolveProjects: (value: Project[]) => void = () => {};
    vi.mocked(api.getProjects).mockReturnValue(
      new Promise<Project[]>((resolve) => {
        resolveProjects = resolve;
      }),
    );
    const both = Promise.all([
      useAppStore.getState().loadPresets(),
      useAppStore.getState().loadProjects(),
    ]);
    resolveProjects([project]);
    await both;
    const s = useAppStore.getState();
    expect(s.projects).toEqual([project]);
    expect(s.error).toBe("Não foi possível conectar ao servidor");
  });

  it("erro não-ApiError vira mensagem genérica amigável", async () => {
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.mocked(api.getProjects).mockRejectedValue(new Error("boom"));
    await useAppStore.getState().loadProjects();
    expect(useAppStore.getState().error).toBe(
      "Não foi possível carregar os projetos.",
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("imagens (URLs de sessão) e caixa do elemento", () => {
  it("setBackgroundImageUrl / setCenterImageUrl definem e limpam", () => {
    useAppStore.getState().setBackgroundImageUrl("blob:bg");
    useAppStore.getState().setCenterImageUrl("blob:center");
    expect(useAppStore.getState().backgroundImageUrl).toBe("blob:bg");
    expect(useAppStore.getState().centerImageUrl).toBe("blob:center");
    useAppStore.getState().setBackgroundImageUrl(null);
    useAppStore.getState().setCenterImageUrl(null);
    expect(useAppStore.getState().backgroundImageUrl).toBeNull();
    expect(useAppStore.getState().centerImageUrl).toBeNull();
  });

  it("applyPreset preserva a caixa do elemento customizada (layout do usuário)", () => {
    const element = { x: 25, y: 10, width: 50, height: 40 };
    useAppStore.getState().setSettings({ element });
    useAppStore.getState().applyPreset({
      id: "p1",
      name: "Preset",
      sceneId: "waveform",
      settings: { sensitivity: 2, intensity: 1.5, paletteId: "violet" },
    });
    const s = useAppStore.getState();
    expect(s.settings.sensitivity).toBe(2);
    expect(s.settings.element).toEqual(element);
  });

  it("setSettings mescla element sem perder os demais campos", () => {
    useAppStore.getState().setSettings({
      element: { x: 5, y: 5, width: 90, height: 90 },
    });
    const s = useAppStore.getState().settings;
    expect(s.sensitivity).toBe(1);
    expect(s.element).toEqual({ x: 5, y: 5, width: 90, height: 90 });
  });
});
