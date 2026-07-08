import { describe, expect, it } from "vitest";
import {
  formatZodError,
  projectInputSchema,
  projectPatchSchema,
  sceneSettingsSchema,
  timelineBlockSchema,
} from "./schemas.js";

const validInput = {
  name: "Projeto",
  audioFileName: null,
  presetId: "eyris-bars",
  settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
  timeline: [{ id: "b1", sceneId: "bars", start: 0, end: 5 }],
};

describe("projectInputSchema", () => {
  it("aceita input válido", () => {
    const result = projectInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("aplica trim no nome", () => {
    const result = projectInputSchema.safeParse({ ...validInput, name: "  Oi  " });
    expect(result.success && result.data.name).toBe("Oi");
  });

  it("rejeita nome vazio", () => {
    const result = projectInputSchema.safeParse({ ...validInput, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejeita audioFileName ausente (undefined)", () => {
    const { audioFileName: _omit, ...rest } = validInput;
    expect(projectInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejeita tipos errados sem lançar (unknown na boundary)", () => {
    expect(projectInputSchema.safeParse("string qualquer").success).toBe(false);
    expect(projectInputSchema.safeParse(null).success).toBe(false);
  });
});

describe("sceneSettingsSchema", () => {
  it("rejeita sensitivity fora de 0.1–3", () => {
    expect(
      sceneSettingsSchema.safeParse({ sensitivity: 0, intensity: 1, paletteId: "x" })
        .success,
    ).toBe(false);
    expect(
      sceneSettingsSchema.safeParse({ sensitivity: 3.1, intensity: 1, paletteId: "x" })
        .success,
    ).toBe(false);
  });

  it("rejeita intensity fora de 0.1–2", () => {
    expect(
      sceneSettingsSchema.safeParse({ sensitivity: 1, intensity: 2.5, paletteId: "x" })
        .success,
    ).toBe(false);
  });
});

describe("timelineBlockSchema", () => {
  it("rejeita end <= start", () => {
    expect(
      timelineBlockSchema.safeParse({ id: "b", sceneId: "bars", start: 5, end: 5 })
        .success,
    ).toBe(false);
  });

  it("rejeita start negativo", () => {
    expect(
      timelineBlockSchema.safeParse({ id: "b", sceneId: "bars", start: -1, end: 5 })
        .success,
    ).toBe(false);
  });
});

describe("projectPatchSchema", () => {
  it("aceita patch vazio e parcial", () => {
    expect(projectPatchSchema.safeParse({}).success).toBe(true);
    expect(projectPatchSchema.safeParse({ name: "Novo" }).success).toBe(true);
  });

  it("valida campos presentes no patch", () => {
    expect(projectPatchSchema.safeParse({ presetId: "" }).success).toBe(false);
  });
});

describe("formatZodError", () => {
  it("inclui caminho e mensagem de cada issue", () => {
    const result = projectInputSchema.safeParse({ ...validInput, name: "" });
    if (result.success) throw new Error("deveria falhar");
    const message = formatZodError(result.error);
    expect(message).toMatch(/^Dados inválidos: /);
    expect(message).toContain("name");
  });
});
