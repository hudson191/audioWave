/**
 * Schemas Zod das boundaries da API.
 * Os tipos inferidos são compatíveis com os contratos de `./types.ts`.
 */
import { z } from "zod";
import type { Project, ProjectInput, ProjectPatch } from "./types.js";

// Mensagens padrão do Zod em pt-BR (cobre issues estruturais sem mensagem
// customizada, ex.: body ausente/tipo errado na raiz do objeto).
z.config(z.locales.pt());

/** Limites de tamanho (defesa contra payloads gigantes persistidos). */
export const MAX_ID_LENGTH = 100;
export const MAX_AUDIO_FILE_NAME_LENGTH = 255;
export const MAX_TIMELINE_BLOCKS = 200;

const ID_TOO_LONG = `deve ter no máximo ${MAX_ID_LENGTH} caracteres`;

export const elementBoxSchema = z.object({
  x: z
    .number("element.x deve ser um número")
    .min(0, "element.x deve estar entre 0 e 100")
    .max(100, "element.x deve estar entre 0 e 100"),
  y: z
    .number("element.y deve ser um número")
    .min(0, "element.y deve estar entre 0 e 100")
    .max(100, "element.y deve estar entre 0 e 100"),
  width: z
    .number("element.width deve ser um número")
    .min(5, "element.width deve estar entre 5 e 100")
    .max(100, "element.width deve estar entre 5 e 100"),
  height: z
    .number("element.height deve ser um número")
    .min(5, "element.height deve estar entre 5 e 100")
    .max(100, "element.height deve estar entre 5 e 100"),
});

export const sceneSettingsSchema = z.object({
  sensitivity: z
    .number("sensitivity deve ser um número")
    .min(0.1, "sensitivity deve estar entre 0.1 e 3")
    .max(3, "sensitivity deve estar entre 0.1 e 3"),
  intensity: z
    .number("intensity deve ser um número")
    .min(0.1, "intensity deve estar entre 0.1 e 2")
    .max(2, "intensity deve estar entre 0.1 e 2"),
  paletteId: z
    .string("paletteId deve ser um texto")
    .min(1, "paletteId é obrigatório")
    .max(MAX_ID_LENGTH, `paletteId ${ID_TOO_LONG}`),
  element: elementBoxSchema.optional(),
});

export const timelineBlockSchema = z
  .object({
    id: z
      .string("id deve ser um texto")
      .min(1, "id do bloco é obrigatório")
      .max(MAX_ID_LENGTH, `id do bloco ${ID_TOO_LONG}`),
    sceneId: z
      .string("sceneId deve ser um texto")
      .min(1, "sceneId é obrigatório")
      .max(MAX_ID_LENGTH, `sceneId ${ID_TOO_LONG}`),
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
    .max(
      MAX_AUDIO_FILE_NAME_LENGTH,
      `audioFileName deve ter no máximo ${MAX_AUDIO_FILE_NAME_LENGTH} caracteres`,
    )
    .nullable(),
  presetId: z
    .string("presetId deve ser um texto")
    .min(1, "presetId é obrigatório")
    .max(MAX_ID_LENGTH, `presetId ${ID_TOO_LONG}`),
  settings: sceneSettingsSchema,
  timeline: z
    .array(timelineBlockSchema, "timeline deve ser uma lista de blocos")
    .max(
      MAX_TIMELINE_BLOCKS,
      `timeline deve ter no máximo ${MAX_TIMELINE_BLOCKS} blocos`,
    ),
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
