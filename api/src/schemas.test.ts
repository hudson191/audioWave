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

describe("limites de tamanho", () => {
  it("rejeita audioFileName com mais de 255 caracteres", () => {
    const result = projectInputSchema.safeParse({
      ...validInput,
      audioFileName: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita presetId e paletteId com mais de 100 caracteres", () => {
    expect(
      projectInputSchema.safeParse({ ...validInput, presetId: "p".repeat(101) })
        .success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({
        ...validInput,
        settings: { ...validInput.settings, paletteId: "x".repeat(101) },
      }).success,
    ).toBe(false);
  });

  it("rejeita id/sceneId de bloco com mais de 100 caracteres", () => {
    expect(
      timelineBlockSchema.safeParse({
        id: "i".repeat(101),
        sceneId: "bars",
        start: 0,
        end: 5,
      }).success,
    ).toBe(false);
    expect(
      timelineBlockSchema.safeParse({
        id: "b",
        sceneId: "s".repeat(101),
        start: 0,
        end: 5,
      }).success,
    ).toBe(false);
  });

  it("rejeita timeline com mais de 200 blocos", () => {
    const timeline = Array.from({ length: 201 }, (_, index) => ({
      id: `b${index}`,
      sceneId: "bars",
      start: index,
      end: index + 1,
    }));
    expect(projectInputSchema.safeParse({ ...validInput, timeline }).success).toBe(
      false,
    );
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

  it("mensagens estruturais padrão saem em pt-BR (sem defaults em inglês)", () => {
    const result = projectInputSchema.safeParse(undefined);
    if (result.success) throw new Error("deveria falhar");
    const message = formatZodError(result.error);
    expect(message).not.toMatch(/Invalid input/);
    expect(message).toMatch(/Dados inválidos/);

    const typeResult = projectInputSchema.safeParse("string qualquer");
    if (typeResult.success) throw new Error("deveria falhar");
    expect(formatZodError(typeResult.error)).not.toMatch(/expected object/);
  });
});

describe("elementBoxSchema (settings.element)", () => {
  const settingsWith = (element: unknown) => ({
    ...validInput,
    settings: { ...validInput.settings, element },
  });

  it("aceita settings sem element (tela cheia)", () => {
    expect(projectInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("aceita element válido", () => {
    const result = projectInputSchema.safeParse(
      settingsWith({ x: 10, y: 20, width: 50, height: 40 }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.element).toEqual({
        x: 10,
        y: 20,
        width: 50,
        height: 40,
      });
    }
  });

  it("rejeita posição fora de 0-100", () => {
    const result = projectInputSchema.safeParse(
      settingsWith({ x: 120, y: 0, width: 50, height: 50 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejeita tamanho fora de 5-100", () => {
    const result = projectInputSchema.safeParse(
      settingsWith({ x: 0, y: 0, width: 2, height: 50 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejeita element com campo não numérico", () => {
    const result = projectInputSchema.safeParse(
      settingsWith({ x: "10", y: 0, width: 50, height: 50 }),
    );
    expect(result.success).toBe(false);
  });
});
