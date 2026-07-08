/**
 * buildApp: monta a instância Fastify com CORS, rotas e handlers de erro.
 * Recebe um ProjectRepository injetável (testes usam arquivo temporário).
 */
import cors from "@fastify/cors";
import fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { fail } from "./envelope.js";
import {
  JsonFileProjectRepository,
  type ProjectRepository,
} from "./repository/projectRepository.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerPresetRoutes } from "./routes/presets.js";
import { registerProjectRoutes } from "./routes/projects.js";

export const FRONTEND_ORIGIN = "http://localhost:5173";

const GENERIC_ERROR_MESSAGE = "Erro interno do servidor. Tente novamente.";
const BAD_REQUEST_MESSAGE = "Requisição inválida: corpo malformado ou ausente.";
const NOT_FOUND_ROUTE_MESSAGE = "Rota não encontrada.";

function extractStatusCode(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return 500;
}

export interface BuildAppOptions {
  repository?: ProjectRepository;
  logger?: FastifyServerOptions["logger"];
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({ logger: options.logger ?? false });
  const repository = options.repository ?? new JsonFileProjectRepository();

  await app.register(cors, {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  registerHealthRoutes(app);
  registerPresetRoutes(app);
  registerProjectRoutes(app, repository);

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.status(404).send(fail(NOT_FOUND_ROUTE_MESSAGE));
  });

  app.setErrorHandler(async (error: unknown, request, reply) => {
    const statusCode = extractStatusCode(error);
    if (statusCode >= 400 && statusCode < 500) {
      request.log.warn({ err: error, url: request.url }, "Erro de requisição");
      return reply.status(statusCode).send(fail(BAD_REQUEST_MESSAGE));
    }
    request.log.error(
      { err: error, url: request.url, method: request.method },
      "Erro não tratado na API",
    );
    return reply.status(500).send(fail(GENERIC_ERROR_MESSAGE));
  });

  return app;
}
