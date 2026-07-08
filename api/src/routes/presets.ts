/** GET /api/presets — seed read-only */
import type { FastifyInstance } from "fastify";
import { ok } from "../envelope.js";
import { VISUAL_PRESETS } from "../presets.js";

export function registerPresetRoutes(app: FastifyInstance): void {
  app.get("/api/presets", async () => ok(VISUAL_PRESETS));
}
