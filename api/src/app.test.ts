import type { FastifyInstance } from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { JsonFileProjectRepository } from "./repository/projectRepository.js";
import type { ApiResponse, Project, ProjectInput, VisualPreset } from "./types.js";

function sampleInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    name: "Clipe de teste",
    audioFileName: "musica.mp3",
    presetId: "eyris-bars",
    settings: { sensitivity: 1.5, intensity: 1.2, paletteId: "violet" },
    timeline: [{ id: "b1", sceneId: "bars", start: 0, end: 30 }],
    ...overrides,
  };
}

describe("API audioWave", () => {
  let app: FastifyInstance;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "audiowave-app-"));
    const repository = new JsonFileProjectRepository(join(dir, "projects.json"));
    app = await buildApp({ repository });
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function createProject(input: ProjectInput = sampleInput()): Promise<Project> {
    const res = await app.inject({ method: "POST", url: "/api/projects", payload: input });
    expect(res.statusCode).toBe(201);
    const body = res.json<ApiResponse<Project>>();
    expect(body.success).toBe(true);
    if (!body.data) throw new Error("resposta sem data");
    return body.data;
  }

  describe("GET /api/health", () => {
    it("responde ok no envelope padrão", async () => {
      const res = await app.inject({ method: "GET", url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: { status: "ok" }, error: null });
    });
  });

  describe("GET /api/presets", () => {
    it("retorna >=6 presets cobrindo todas as cenas e paletas", async () => {
      const res = await app.inject({ method: "GET", url: "/api/presets" });
      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<VisualPreset[]>>();
      expect(body.success).toBe(true);
      const presets = body.data ?? [];
      expect(presets.length).toBeGreaterThanOrEqual(6);

      const ids = new Set(presets.map((p) => p.id));
      expect(ids.size).toBe(presets.length);

      const scenes = new Set(presets.map((p) => p.sceneId));
      expect(scenes).toEqual(new Set(["bars", "waveform", "particles"]));

      const palettes = new Set(presets.map((p) => p.settings.paletteId));
      for (const palette of ["eyris", "violet", "emerald", "sunset"]) {
        expect(palettes.has(palette)).toBe(true);
      }
    });
  });

  describe("GET /api/projects", () => {
    it("começa com lista vazia", async () => {
      const res = await app.inject({ method: "GET", url: "/api/projects" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: [], error: null });
    });

    it("lista projetos criados", async () => {
      const created = await createProject();
      const res = await app.inject({ method: "GET", url: "/api/projects" });
      const body = res.json<ApiResponse<Project[]>>();
      expect(body.data).toEqual([created]);
    });
  });

  describe("POST /api/projects", () => {
    it("cria projeto e responde 201 com envelope", async () => {
      const created = await createProject();
      expect(created.id).toBeTruthy();
      expect(created.name).toBe("Clipe de teste");
      expect(created.createdAt).toBe(created.updatedAt);
    });

    it("400 quando o body é inválido, com mensagem clara", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { ...sampleInput(), name: "", settings: { sensitivity: 99 } },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json<ApiResponse<null>>();
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error).toMatch(/Dados inválidos/);
      expect(body.error).toMatch(/name/);
    });

    it("400 estrutural com mensagem clara em pt-BR quando o body está ausente", async () => {
      const res = await app.inject({ method: "POST", url: "/api/projects" });
      expect(res.statusCode).toBe(400);
      const body = res.json<ApiResponse<null>>();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/Dados inválidos/);
      expect(body.error).not.toMatch(/Invalid input|expected object|received/);
    });

    it("400 quando o JSON é malformado", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: "{quebrado",
        headers: { "content-type": "application/json" },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json<ApiResponse<null>>();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/Requisição inválida/);
    });

    it("400 quando a timeline tem end <= start", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/projects",
        payload: sampleInput({
          timeline: [{ id: "b1", sceneId: "bars", start: 10, end: 5 }],
        }),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json<ApiResponse<null>>().error).toMatch(/end/);
    });
  });

  describe("GET /api/projects/:id", () => {
    it("retorna o projeto existente", async () => {
      const created = await createProject();
      const res = await app.inject({ method: "GET", url: `/api/projects/${created.id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json<ApiResponse<Project>>().data).toEqual(created);
    });

    it("404 para id inexistente", async () => {
      const res = await app.inject({ method: "GET", url: "/api/projects/nao-existe" });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        success: false,
        data: null,
        error: "Projeto não encontrado.",
      });
    });
  });

  describe("PUT /api/projects/:id", () => {
    it("atualiza parcialmente preservando os demais campos", async () => {
      const created = await createProject();
      const res = await app.inject({
        method: "PUT",
        url: `/api/projects/${created.id}`,
        payload: { name: "Renomeado", audioFileName: null },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<Project>>();
      expect(body.data?.name).toBe("Renomeado");
      expect(body.data?.audioFileName).toBeNull();
      expect(body.data?.presetId).toBe(created.presetId);
      expect(body.data?.settings).toEqual(created.settings);
      expect(body.data?.createdAt).toBe(created.createdAt);
    });

    it("400 para patch inválido", async () => {
      const created = await createProject();
      const res = await app.inject({
        method: "PUT",
        url: `/api/projects/${created.id}`,
        payload: { settings: { sensitivity: 0, intensity: 1, paletteId: "eyris" } },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json<ApiResponse<null>>().error).toMatch(/sensitivity/);
    });

    it("404 para id inexistente", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/projects/nao-existe",
        payload: { name: "x" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/projects/:id", () => {
    it("remove e responde com data null", async () => {
      const created = await createProject();
      const res = await app.inject({
        method: "DELETE",
        url: `/api/projects/${created.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: null, error: null });

      const after = await app.inject({ method: "GET", url: `/api/projects/${created.id}` });
      expect(after.statusCode).toBe(404);
    });

    it("aceita Content-Type: application/json com body vazio (fetch de browsers)", async () => {
      const created = await createProject();
      const res = await app.inject({
        method: "DELETE",
        url: `/api/projects/${created.id}`,
        headers: { "content-type": "application/json" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true, data: null, error: null });

      const after = await app.inject({ method: "GET", url: `/api/projects/${created.id}` });
      expect(after.statusCode).toBe(404);
    });

    it("404 para id inexistente", async () => {
      const res = await app.inject({ method: "DELETE", url: "/api/projects/nao-existe" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("integração real (listen + fetch)", () => {
    it("DELETE via fetch com Content-Type JSON e sem body remove o projeto", async () => {
      const created = await createProject();
      const address = await app.listen({ port: 0, host: "127.0.0.1" });

      // reproduz exatamente o que um client fetch de browser enviaria
      const res = await fetch(`${address}/api/projects/${created.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, data: null, error: null });

      const after = await fetch(`${address}/api/projects/${created.id}`);
      expect(after.status).toBe(404);
    });
  });

  describe("erros gerais", () => {
    it("404 com envelope para rota desconhecida", async () => {
      const res = await app.inject({ method: "GET", url: "/api/desconhecida" });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        success: false,
        data: null,
        error: "Rota não encontrada.",
      });
    });

    it("CORS liberado para localhost:5173", async () => {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/projects",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "GET",
        },
      });
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("500 genérico quando o repositório falha", async () => {
      const failing = {
        findAll: () => Promise.reject(new Error("disco falhou")),
        findById: () => Promise.reject(new Error("disco falhou")),
        create: () => Promise.reject(new Error("disco falhou")),
        update: () => Promise.reject(new Error("disco falhou")),
        delete: () => Promise.reject(new Error("disco falhou")),
      };
      const brokenApp = await buildApp({ repository: failing });
      const res = await brokenApp.inject({ method: "GET", url: "/api/projects" });
      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({
        success: false,
        data: null,
        error: "Erro interno do servidor. Tente novamente.",
      });
      await brokenApp.close();
    });
  });
});
