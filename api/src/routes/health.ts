/** GET /api/health */
import type { FastifyInstance } from "fastify";
import { ok } from "../envelope.js";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/api/health", async () => ok({ status: "ok" as const }));
}
