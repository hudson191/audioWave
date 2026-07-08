import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, VisualPreset } from "../shared/types";
import {
  createProject,
  deleteProject,
  getPresets,
  getProject,
  getProjects,
  updateProject,
} from "./client";
import { ApiError } from "./errors";

const preset: VisualPreset = {
  id: "eyris-bars",
  name: "Barras Eyris",
  sceneId: "bars",
  settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
};

const project: Project = {
  id: "p1",
  name: "Meu projeto",
  audioFileName: "track.mp3",
  presetId: "eyris-bars",
  settings: { sensitivity: 1.2, intensity: 0.8, paletteId: "eyris" },
  timeline: [],
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

function envelope(data: unknown, error: string | null = null): string {
  return JSON.stringify({ success: error === null, data, error });
}

function stubFetch(body: string, status = 200): ReturnType<typeof vi.fn> {
  const mock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(body, { status })));
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("client — sucesso", () => {
  it("getPresets retorna data do envelope", async () => {
    const mock = stubFetch(envelope([preset]));
    await expect(getPresets()).resolves.toEqual([preset]);
    expect(mock).toHaveBeenCalledWith("/api/presets", expect.any(Object));
  });

  it("getProjects retorna lista de projetos", async () => {
    stubFetch(envelope([project]));
    await expect(getProjects()).resolves.toEqual([project]);
  });

  it("getProject usa o id na URL (com encode)", async () => {
    const mock = stubFetch(envelope(project));
    await expect(getProject("p 1")).resolves.toEqual(project);
    expect(mock).toHaveBeenCalledWith(
      "/api/projects/p%201",
      expect.any(Object),
    );
  });

  it("createProject envia POST com body JSON", async () => {
    const mock = stubFetch(envelope(project), 201);
    const input = {
      name: project.name,
      audioFileName: project.audioFileName,
      presetId: project.presetId,
      settings: project.settings,
      timeline: project.timeline,
    };
    await expect(createProject(input)).resolves.toEqual(project);
    expect(mock).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  });

  it("updateProject envia PUT parcial", async () => {
    const mock = stubFetch(envelope(project));
    await expect(updateProject("p1", { name: "Novo" })).resolves.toEqual(
      project,
    );
    expect(mock).toHaveBeenCalledWith(
      "/api/projects/p1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Novo" }),
      }),
    );
  });

  it("deleteProject envia DELETE e resolve void", async () => {
    const mock = stubFetch(envelope(null));
    await expect(deleteProject("p1")).resolves.toBeUndefined();
    expect(mock).toHaveBeenCalledWith(
      "/api/projects/p1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("NÃO envia Content-Type em requisições sem body (DELETE/GET)", async () => {
    const mock = stubFetch(envelope(null));
    await deleteProject("p1");
    await getProjects().catch(() => undefined);
    for (const call of mock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      expect(init?.headers).toBeUndefined();
    }
  });

  it("envia Content-Type: application/json quando há body (POST/PUT)", async () => {
    const mock = stubFetch(envelope(project), 201);
    await createProject({
      name: project.name,
      audioFileName: project.audioFileName,
      presetId: project.presetId,
      settings: project.settings,
      timeline: project.timeline,
    });
    await updateProject("p1", { name: "Novo" });
    for (const call of mock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    }
  });
});

describe("client — erros", () => {
  it("envelope com success:false lança ApiError com a mensagem do servidor", async () => {
    stubFetch(envelope(null, "Projeto não encontrado."), 404);
    const promise = getProject("x");
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(getProject("x")).rejects.toThrow("Projeto não encontrado.");
  });

  it("HTTP 500 sem mensagem usa texto amigável padrão", async () => {
    stubFetch(envelope(null, ""), 500);
    await expect(getProjects()).rejects.toThrow(
      "Erro interno do servidor. Tente novamente mais tarde.",
    );
  });

  it("HTTP 500 preserva status no ApiError", async () => {
    stubFetch(envelope(null, "Falha grave."), 500);
    const error = await getProjects().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it("falha de rede lança 'Não foi possível conectar ao servidor'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const error = await getPresets().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      "Não foi possível conectar ao servidor",
    );
    expect((error as ApiError).status).toBeNull();
  });

  it("corpo que não é JSON lança ApiError", async () => {
    stubFetch("<html>erro</html>", 500);
    await expect(getPresets()).rejects.toBeInstanceOf(ApiError);
  });

  it("envelope malformado lança ApiError", async () => {
    stubFetch(JSON.stringify({ foo: "bar" }), 200);
    await expect(getPresets()).rejects.toBeInstanceOf(ApiError);
  });

  it("HTTP ok mas success:false ainda é erro", async () => {
    stubFetch(envelope(null, "Dados inválidos informados."), 200);
    await expect(getProjects()).rejects.toThrow("Dados inválidos informados.");
  });
});
