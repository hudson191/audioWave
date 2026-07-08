import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProjectInput } from "../types.js";
import { JsonFileProjectRepository } from "./projectRepository.js";

function sampleInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    name: "Meu clipe",
    audioFileName: "track.mp3",
    presetId: "eyris-bars",
    settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
    timeline: [{ id: "b1", sceneId: "bars", start: 0, end: 12 }],
    ...overrides,
  };
}

describe("JsonFileProjectRepository", () => {
  let dir: string;
  let filePath: string;
  let repo: JsonFileProjectRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "audiowave-repo-"));
    filePath = join(dir, "nested", "projects.json");
    repo = new JsonFileProjectRepository(filePath);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("retorna lista vazia e cria o arquivo quando ele não existe", async () => {
    const projects = await repo.findAll();
    expect(projects).toEqual([]);
    const raw = await readFile(filePath, "utf8");
    expect(JSON.parse(raw)).toEqual([]);
  });

  it("cria projeto com id, createdAt e updatedAt", async () => {
    const created = await repo.create(sampleInput());
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
    expect(created.name).toBe("Meu clipe");
  });

  it("não muta o input nem compartilha referências internas", async () => {
    const input = sampleInput();
    const inputSnapshot = JSON.parse(JSON.stringify(input)) as ProjectInput;
    const created = await repo.create(input);

    expect(input).toEqual(inputSnapshot);
    expect(created.settings).not.toBe(input.settings);
    expect(created.timeline).not.toBe(input.timeline);
    expect(created.timeline[0]).not.toBe(input.timeline[0]);
  });

  it("persiste entre instâncias (leitura do arquivo)", async () => {
    const created = await repo.create(sampleInput());
    const otherRepo = new JsonFileProjectRepository(filePath);
    const found = await otherRepo.findById(created.id);
    expect(found).toEqual(created);
  });

  it("findById retorna null para id inexistente", async () => {
    expect(await repo.findById("nao-existe")).toBeNull();
  });

  it("update aplica patch parcial preservando os demais campos", async () => {
    const created = await repo.create(sampleInput());
    const updated = await repo.update(created.id, { name: "Novo nome" });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Novo nome");
    expect(updated?.presetId).toBe(created.presetId);
    expect(updated?.settings).toEqual(created.settings);
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(Date.parse(updated?.updatedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(created.updatedAt),
    );
  });

  it("update aceita audioFileName null explicitamente", async () => {
    const created = await repo.create(sampleInput());
    const updated = await repo.update(created.id, { audioFileName: null });
    expect(updated?.audioFileName).toBeNull();
  });

  it("update retorna null para id inexistente", async () => {
    expect(await repo.update("nao-existe", { name: "x" })).toBeNull();
  });

  it("delete remove e retorna false na segunda tentativa", async () => {
    const created = await repo.create(sampleInput());
    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.delete(created.id)).toBe(false);
    expect(await repo.findAll()).toEqual([]);
  });

  it("operações concorrentes não perdem escritas", async () => {
    const inputs = Array.from({ length: 5 }, (_, i) =>
      sampleInput({ name: `Projeto ${i}` }),
    );
    await Promise.all(inputs.map((input) => repo.create(input)));
    const all = await repo.findAll();
    expect(all).toHaveLength(5);
  });

  it("rejeita arquivo com JSON inválido", async () => {
    await repo.findAll();
    await writeFile(filePath, "{isso não é json", "utf8");
    await expect(repo.findAll()).rejects.toThrow(/corrompido/i);
  });

  it("rejeita arquivo com formato inesperado", async () => {
    await repo.findAll();
    await writeFile(filePath, JSON.stringify({ nada: true }), "utf8");
    await expect(repo.findAll()).rejects.toThrow(/formato inesperado/i);
  });
});
