import { describe, expect, it } from "vitest";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  extractExtension,
  MAX_AUDIO_FILE_BYTES,
  validateAudioFile,
} from "./validation";

const MB = 1024 * 1024;

function expectError(result: ReturnType<typeof validateAudioFile>): string {
  expect(result.ok).toBe(false);
  return result.ok ? "" : result.error;
}

describe("validateAudioFile", () => {
  it("aceita mp3 com mime correto", () => {
    const result = validateAudioFile({
      name: "musica.mp3",
      size: 3 * MB,
      type: "audio/mpeg",
    });
    expect(result).toEqual({ ok: true });
  });

  it.each(ALLOWED_AUDIO_EXTENSIONS)("aceita extensão .%s", (ext) => {
    const result = validateAudioFile({ name: `faixa.${ext}`, size: MB, type: "" });
    expect(result.ok).toBe(true);
  });

  it("aceita extensão maiúscula", () => {
    expect(validateAudioFile({ name: "MUSICA.MP3", size: MB }).ok).toBe(true);
  });

  it("aceita mime ausente/vazio quando extensão é válida", () => {
    expect(validateAudioFile({ name: "a.m4a", size: MB }).ok).toBe(true);
    expect(validateAudioFile({ name: "a.m4a", size: MB, type: "" }).ok).toBe(true);
  });

  it("rejeita extensão não suportada com mensagem pt-BR", () => {
    const error = expectError(
      validateAudioFile({ name: "video.txt", size: MB, type: "text/plain" }),
    );
    expect(error).toBe("Formato não suportado. Envie um arquivo MP3, WAV, OGG ou M4A.");
  });

  it("rejeita arquivo sem extensão", () => {
    const error = expectError(validateAudioFile({ name: "musica", size: MB }));
    expect(error).toContain("Formato não suportado");
  });

  it("rejeita mime incompatível mesmo com extensão válida", () => {
    const error = expectError(
      validateAudioFile({ name: "fake.mp3", size: MB, type: "video/mp4" }),
    );
    expect(error).toContain("Tipo de arquivo não suportado");
  });

  it("rejeita arquivo vazio", () => {
    const error = expectError(
      validateAudioFile({ name: "a.mp3", size: 0, type: "audio/mpeg" }),
    );
    expect(error).toBe("O arquivo de áudio está vazio ou corrompido.");
  });

  it("rejeita acima de 50MB e aceita exatamente 50MB", () => {
    const tooBig = validateAudioFile({
      name: "a.wav",
      size: MAX_AUDIO_FILE_BYTES + 1,
      type: "audio/wav",
    });
    expect(expectError(tooBig)).toBe("O arquivo excede o tamanho máximo de 50MB.");
    expect(
      validateAudioFile({ name: "a.wav", size: MAX_AUDIO_FILE_BYTES, type: "audio/wav" }).ok,
    ).toBe(true);
  });

  it("aceita variações de mime comuns", () => {
    expect(validateAudioFile({ name: "a.ogg", size: MB, type: "application/ogg" }).ok).toBe(true);
    expect(validateAudioFile({ name: "a.m4a", size: MB, type: "audio/x-m4a" }).ok).toBe(true);
    expect(validateAudioFile({ name: "a.wav", size: MB, type: "audio/x-wav" }).ok).toBe(true);
  });
});

describe("extractExtension", () => {
  it("extrai extensão minúscula", () => {
    expect(extractExtension("Faixa.MP3")).toBe("mp3");
    expect(extractExtension("a.b.ogg")).toBe("ogg");
  });

  it("retorna null quando não há extensão", () => {
    expect(extractExtension("semext")).toBeNull();
    expect(extractExtension(".oculto")).toBeNull();
    expect(extractExtension("termina.")).toBeNull();
  });
});
