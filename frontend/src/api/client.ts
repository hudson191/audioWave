/**
 * Client REST tipado da API do audioWave (base /api, proxy Vite → 3001).
 * Todas as respostas usam o envelope ApiResponse<T>; falhas lançam ApiError
 * com mensagem amigável em pt-BR.
 */
import type {
  ApiResponse,
  Project,
  ProjectInput,
  VisualPreset,
} from "../shared/types";
import { ApiError } from "./errors";

const API_BASE = "/api";

const NETWORK_ERROR_MESSAGE = "Não foi possível conectar ao servidor";
const GENERIC_ERROR_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: "Dados inválidos. Verifique as informações e tente novamente.",
  404: "Recurso não encontrado.",
  500: "Erro interno do servidor. Tente novamente mais tarde.",
};

function messageForStatus(status: number): string {
  return STATUS_MESSAGES[status] ?? GENERIC_ERROR_MESSAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  return (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    "data" in value &&
    "error" in value
  );
}

async function parseEnvelope(res: Response): Promise<ApiResponse<unknown>> {
  let body: unknown;
  try {
    body = await res.json();
  } catch (error: unknown) {
    console.error("[api] resposta não é JSON válido", error);
    throw new ApiError(messageForStatus(res.status), res.status);
  }
  if (!isEnvelope(body)) {
    console.error("[api] envelope de resposta inválido", body);
    throw new ApiError(messageForStatus(res.status), res.status);
  }
  return body;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (error: unknown) {
    console.error("[api] falha de rede", error);
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }

  const envelope = await parseEnvelope(res);
  if (!res.ok || !envelope.success) {
    const message =
      typeof envelope.error === "string" && envelope.error.trim().length > 0
        ? envelope.error
        : messageForStatus(res.status);
    throw new ApiError(message, res.status);
  }
  return envelope.data as T;
}

/** Lista os presets visuais disponíveis. */
export function getPresets(): Promise<VisualPreset[]> {
  return request<VisualPreset[]>("/presets");
}

/** Lista todos os projetos salvos. */
export function getProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

/** Busca um projeto pelo id. */
export function getProject(id: string): Promise<Project> {
  return request<Project>(`/projects/${encodeURIComponent(id)}`);
}

/** Cria um novo projeto. */
export function createProject(input: ProjectInput): Promise<Project> {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Atualiza parcialmente um projeto existente. */
export function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  return request<Project>(`/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Remove um projeto pelo id. */
export async function deleteProject(id: string): Promise<void> {
  await request<null>(`/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
