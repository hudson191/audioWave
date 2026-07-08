/**
 * Repository de projetos: interface + implementação em arquivo JSON.
 * Escritas atômicas (arquivo temporário + rename) e dados imutáveis.
 */
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { projectsFileSchema } from "../schemas.js";
import type { Project, ProjectInput, ProjectPatch } from "../types.js";

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, patch: ProjectPatch): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}

/** Caminho padrão: <raiz da api>/data/projects.json */
export const DEFAULT_DATA_FILE = fileURLToPath(
  new URL("../../data/projects.json", import.meta.url),
);

function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    settings: { ...project.settings },
    timeline: project.timeline.map((block) => ({ ...block })),
  };
}

function buildProject(input: ProjectInput, now: string): Project {
  return {
    id: randomUUID(),
    name: input.name,
    audioFileName: input.audioFileName,
    presetId: input.presetId,
    settings: { ...input.settings },
    timeline: input.timeline.map((block) => ({ ...block })),
    createdAt: now,
    updatedAt: now,
  };
}

function applyPatch(existing: Project, patch: ProjectPatch, now: string): Project {
  return {
    ...existing,
    name: patch.name ?? existing.name,
    audioFileName:
      patch.audioFileName !== undefined ? patch.audioFileName : existing.audioFileName,
    presetId: patch.presetId ?? existing.presetId,
    settings: patch.settings ? { ...patch.settings } : { ...existing.settings },
    timeline: (patch.timeline ?? existing.timeline).map((block) => ({ ...block })),
    updatedAt: now,
  };
}

export class JsonFileProjectRepository implements ProjectRepository {
  private readonly filePath: string;
  /** Serializa operações para evitar corridas de leitura+escrita no arquivo. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(filePath: string = DEFAULT_DATA_FILE) {
    this.filePath = filePath;
  }

  async findAll(): Promise<Project[]> {
    return this.enqueue(() => this.readProjects());
  }

  async findById(id: string): Promise<Project | null> {
    const projects = await this.findAll();
    return projects.find((project) => project.id === id) ?? null;
  }

  async create(input: ProjectInput): Promise<Project> {
    return this.enqueue(async () => {
      const projects = await this.readProjects();
      const project = buildProject(input, new Date().toISOString());
      await this.writeProjects([...projects, project]);
      return cloneProject(project);
    });
  }

  async update(id: string, patch: ProjectPatch): Promise<Project | null> {
    return this.enqueue(async () => {
      const projects = await this.readProjects();
      const existing = projects.find((project) => project.id === id);
      if (!existing) return null;
      const updated = applyPatch(existing, patch, new Date().toISOString());
      const next = projects.map((project) => (project.id === id ? updated : project));
      await this.writeProjects(next);
      return cloneProject(updated);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const projects = await this.readProjects();
      const next = projects.filter((project) => project.id !== id);
      if (next.length === projects.length) return false;
      await this.writeProjects(next);
      return true;
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async readProjects(): Promise<Project[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, "utf8");
    } catch (error: unknown) {
      if (isFileNotFound(error)) {
        await this.writeProjects([]);
        return [];
      }
      throw error;
    }
    return parseProjectsFile(raw, this.filePath);
  }

  private async writeProjects(projects: readonly Project[]): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${randomUUID()}.tmp`;
    const contents = `${JSON.stringify(projects, null, 2)}\n`;
    await fs.writeFile(tmpPath, contents, "utf8");
    await fs.rename(tmpPath, this.filePath);
  }
}

function parseProjectsFile(raw: string, filePath: string): Project[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Arquivo de projetos corrompido (JSON inválido): ${filePath}`);
  }
  const parsed = projectsFileSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Arquivo de projetos com formato inesperado: ${filePath}`);
  }
  return parsed.data;
}
