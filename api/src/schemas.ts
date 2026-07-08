/**
 * Schemas Zod das boundaries da API.
 * Os tipos inferidos são compatíveis com os contratos de `./types.ts`.
 */
import { z } from "zod";
import type { Project, ProjectInput, ProjectPatch } from "./types.js";

export const sceneSettingsSchema = z.object({
  sensitivity: z
    .number("sensitivity deve ser um número")
    .min(0.1, "sensitivity deve estar entre 0.1 e 3")
    .max(3, "sensitivity deve estar entre 0.1 e 3"),
  intensity: z
    .number("intensity deve ser um número")
    .min(0.1, "intensity deve estar entre 0.1 e 2")
    .max(2, "intensity deve estar entre 0.1 e 2"),
  paletteId: z.string("paletteId deve ser um texto").min(1, "paletteId é obrigatório"),
});

export const timelineBlockSchema = z
  .object({
    id: z.string("id deve ser um texto").min(1, "id do bloco é obrigatório"),
    sceneId: z.string("sceneId deve ser um texto").min(1, "sceneId é obrigatório"),
    start: z.number("start deve ser um número").min(0, "start não pode ser negativo"),
    end: z.number("end deve ser um número").min(0, "end não pode ser negativo"),
  })
  .refine((block) => block.end > block.start, {
    message: "end deve ser maior que start",
    path: ["end"],
  });

export const projectInputSchema = z.object({
  name: z
    .string("name deve ser um texto")
    .trim()
    .min(1, "O nome do projeto é obrigatório")
    .max(120, "O nome do projeto deve ter no máximo 120 caracteres"),
  audioFileName: z
    .string("audioFileName deve ser um texto ou null")
    .min(1, "audioFileName não pode ser vazio")
    .nullable(),
  presetId: z.string("presetId deve ser um texto").min(1, "presetId é obrigatório"),
  settings: sceneSettingsSchema,
  timeline: z.array(timelineBlockSchema, "timeline deve ser uma lista de blocos"),
});

export const projectPatchSchema = projectInputSchema.partial();

export const projectSchema = projectInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

/** Conteúdo esperado do arquivo de persistência (api/data/projects.json) */
export const projectsFileSchema = z.array(projectSchema);

// Verificação estática: os tipos inferidos devem conformar com o contrato.
type AssertExtends<A extends B, B> = A;
type _InputOk = AssertExtends<z.infer<typeof projectInputSchema>, ProjectInput>;
type _PatchOk = AssertExtends<z.infer<typeof projectPatchSchema>, ProjectPatch>;
type _ProjectOk = AssertExtends<z.infer<typeof projectSchema>, Project>;

/** Converte um ZodError em mensagem amigável (pt-BR) para respostas 400. */
export function formatZodError(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
  return `Dados inválidos: ${details}`;
}
