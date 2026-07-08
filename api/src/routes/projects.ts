/** CRUD /api/projects */
import type { FastifyInstance, FastifyReply } from "fastify";
import { fail, ok } from "../envelope.js";
import type { ProjectRepository } from "../repository/projectRepository.js";
import { formatZodError, projectInputSchema, projectPatchSchema } from "../schemas.js";

interface IdParams {
  Params: { id: string };
}

const NOT_FOUND_MESSAGE = "Projeto não encontrado.";

function sendNotFound(reply: FastifyReply): FastifyReply {
  return reply.status(404).send(fail(NOT_FOUND_MESSAGE));
}

export function registerProjectRoutes(
  app: FastifyInstance,
  repository: ProjectRepository,
): void {
  app.get("/api/projects", async () => ok(await repository.findAll()));

  app.get<IdParams>("/api/projects/:id", async (request, reply) => {
    const project = await repository.findById(request.params.id);
    if (!project) return sendNotFound(reply);
    return ok(project);
  });

  app.post("/api/projects", async (request, reply) => {
    const parsed = projectInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(fail(formatZodError(parsed.error)));
    }
    const project = await repository.create(parsed.data);
    return reply.status(201).send(ok(project));
  });

  app.put<IdParams>("/api/projects/:id", async (request, reply) => {
    const parsed = projectPatchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send(fail(formatZodError(parsed.error)));
    }
    const project = await repository.update(request.params.id, parsed.data);
    if (!project) return sendNotFound(reply);
    return ok(project);
  });

  app.delete<IdParams>("/api/projects/:id", async (request, reply) => {
    const removed = await repository.delete(request.params.id);
    if (!removed) return sendNotFound(reply);
    return ok(null);
  });
}
