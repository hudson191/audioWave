import { describe, expect, it } from "vitest";
import {
  EXPORT_RESOLUTIONS,
  MIME_CANDIDATES,
  applyExportSize,
  buildExportFileName,
  computeExportProgress,
  findResolution,
  pickSupportedMimeType,
  waitForCanvasSize,
} from "./exportUtils";

describe("waitForCanvasSize", () => {
  const makeCanvas = (width: number, height: number) =>
    ({ width, height }) as HTMLCanvasElement;

  it("resolve true imediatamente se o canvas já está no tamanho alvo", async () => {
    const canvas = makeCanvas(1920, 1080);
    await expect(waitForCanvasSize(canvas, 1920, 1080, 100)).resolves.toBe(
      true,
    );
  });

  it("resolve true quando o buffer atinge o alvo em alguns frames", async () => {
    const canvas = makeCanvas(2108, 1314);
    // simula o ResizeObserver do RenderEngine ajustando o buffer depois
    setTimeout(() => {
      canvas.width = 1920;
      canvas.height = 1080;
    }, 30);
    await expect(waitForCanvasSize(canvas, 1920, 1080, 500)).resolves.toBe(
      true,
    );
  });

  it("resolve false no timeout se o buffer nunca chega ao alvo", async () => {
    const canvas = makeCanvas(2108, 1314);
    await expect(waitForCanvasSize(canvas, 1920, 1080, 80)).resolves.toBe(
      false,
    );
  });
});

describe("findResolution", () => {
  it("encontra resoluções conhecidas", () => {
    expect(findResolution("720p").width).toBe(1280);
    expect(findResolution("1080p").height).toBe(1080);
  });

  it("faz fallback para a primeira resolução", () => {
    expect(findResolution("4k")).toBe(EXPORT_RESOLUTIONS[0]);
  });
});

describe("pickSupportedMimeType", () => {
  it("retorna o primeiro candidato suportado", () => {
    const pick = pickSupportedMimeType(
      (type) => type === "video/webm;codecs=vp8,opus",
    );
    expect(pick).toBe("video/webm;codecs=vp8,opus");
  });

  it("prefere vp9 quando disponível", () => {
    expect(pickSupportedMimeType(() => true)).toBe(MIME_CANDIDATES[0]);
  });

  it("retorna null sem suporte", () => {
    expect(pickSupportedMimeType(() => false)).toBeNull();
  });

  it("trata exceções do checker como não suportado", () => {
    const pick = pickSupportedMimeType((type) => {
      if (type.includes("vp9")) {
        throw new Error("boom");
      }
      return true;
    });
    expect(pick).toBe("video/webm;codecs=vp8,opus");
  });
});

describe("buildExportFileName", () => {
  it("usa o nome do áudio sem extensão, sanitizado", () => {
    expect(buildExportFileName("Minha Música.mp3")).toBe(
      "audiowave-minha-música.webm",
    );
  });

  it("remove caracteres especiais", () => {
    expect(buildExportFileName("mix/final*?.wav")).toBe(
      "audiowave-mixfinal.webm",
    );
  });

  it("faz fallback para 'video'", () => {
    expect(buildExportFileName(null)).toBe("audiowave-video.webm");
    expect(buildExportFileName("???.ogg")).toBe("audiowave-video.webm");
  });
});

describe("computeExportProgress", () => {
  it("calcula fração 0-1", () => {
    expect(computeExportProgress(30, 60)).toBe(0.5);
  });

  it("clampa em 0-1", () => {
    expect(computeExportProgress(90, 60)).toBe(1);
    expect(computeExportProgress(-3, 60)).toBe(0);
  });

  it("retorna 0 para duração inválida", () => {
    expect(computeExportProgress(10, 0)).toBe(0);
    expect(computeExportProgress(10, Number.NaN)).toBe(0);
  });
});

describe("applyExportSize", () => {
  it("aplica tamanho CSS compensando o DPR e restaura depois", () => {
    const canvas = document.createElement("canvas");
    canvas.style.width = "500px";
    canvas.style.height = "300px";

    const restore = applyExportSize(canvas, 1280, 720, 2);
    expect(canvas.style.width).toBe("640px");
    expect(canvas.style.height).toBe("360px");

    restore();
    expect(canvas.style.width).toBe("500px");
    expect(canvas.style.height).toBe("300px");
  });

  it("trata DPR inválido como 1", () => {
    const canvas = document.createElement("canvas");
    const restore = applyExportSize(canvas, 1280, 720, Number.NaN);
    expect(canvas.style.width).toBe("1280px");
    expect(canvas.style.height).toBe("720px");
    restore();
  });
});
