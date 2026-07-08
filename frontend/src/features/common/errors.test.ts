import { describe, expect, it } from "vitest";
import { GENERIC_ERROR_MESSAGE, getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("retorna a mensagem de um Error", () => {
    expect(getErrorMessage(new Error("Falhou feio."))).toBe("Falhou feio.");
  });

  it("retorna strings não vazias diretamente", () => {
    expect(getErrorMessage("Deu ruim.")).toBe("Deu ruim.");
  });

  it("usa o fallback para Error com mensagem vazia", () => {
    expect(getErrorMessage(new Error("  "))).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("usa o fallback para valores desconhecidos", () => {
    expect(getErrorMessage(42)).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorMessage(null)).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("aceita fallback customizado", () => {
    expect(getErrorMessage(null, "Erro no upload.")).toBe("Erro no upload.");
  });
});
