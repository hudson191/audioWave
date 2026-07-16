import { describe, expect, it } from "vitest";
import {
  applySensitivity,
  clamp,
  decayPeaks,
  expSmooth,
  hexToRgba,
  integrate,
  isAlive,
  lerp,
  mapBinsToBars,
  normalizeByte,
  particleAlpha,
  spawnParticle,
  type Particle,
} from "./math";

describe("clamp", () => {
  it("restringe ao intervalo", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("NaN cai no mínimo", () => {
    expect(clamp(Number.NaN, 2, 10)).toBe(2);
  });
});

describe("lerp", () => {
  it("interpola linearmente", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it("clampa t fora de [0,1]", () => {
    expect(lerp(0, 10, 2)).toBe(10);
    expect(lerp(0, 10, -1)).toBe(0);
  });
});

describe("expSmooth", () => {
  it("aproxima do alvo sem ultrapassar", () => {
    const next = expSmooth(0, 1, 0.016, 10);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("dt 0 não altera o valor", () => {
    expect(expSmooth(0.3, 1, 0, 10)).toBe(0.3);
  });

  it("dt grande converge para o alvo", () => {
    expect(expSmooth(0, 1, 100, 10)).toBeCloseTo(1, 5);
  });
});

describe("normalizeByte / applySensitivity", () => {
  it("normaliza bytes", () => {
    expect(normalizeByte(0)).toBe(0);
    expect(normalizeByte(255)).toBe(1);
    expect(normalizeByte(510)).toBe(1);
  });

  it("sensitivity multiplica e clampa em 0-1", () => {
    expect(applySensitivity(0.4, 2)).toBeCloseTo(0.8);
    expect(applySensitivity(0.8, 3)).toBe(1);
    expect(applySensitivity(0.8, 0.5)).toBeCloseTo(0.4);
  });
});

describe("mapBinsToBars", () => {
  it("retorna barCount valores em 0-1", () => {
    const bins = new Uint8Array(1024).fill(255);
    const bars = mapBinsToBars(bins, 48);
    expect(bars).toHaveLength(48);
    bars.forEach((b) => expect(b).toBe(1));
  });

  it("entrada vazia retorna zeros", () => {
    const bars = mapBinsToBars(new Uint8Array(0), 16);
    expect(bars).toHaveLength(16);
    bars.forEach((b) => expect(b).toBe(0));
  });

  it("barCount inválido vira 1", () => {
    expect(mapBinsToBars(new Uint8Array(64).fill(128), 0)).toHaveLength(1);
  });

  it("faz média dos grupos", () => {
    const bins = new Uint8Array(10);
    bins.fill(255, 0, 4); // porção útil = 8 bins; primeiro grupo cheio
    const bars = mapBinsToBars(bins, 2);
    expect(bars[0]).toBe(1);
    expect(bars[1]).toBe(0);
  });
});

describe("decayPeaks", () => {
  it("pico sobe instantaneamente com o valor", () => {
    expect(decayPeaks([0.2], [0.9], 0.016)[0]).toBe(0.9);
  });

  it("pico decai com o tempo quando o valor cai", () => {
    const next = decayPeaks([0.9], [0.1], 0.5, 0.6);
    expect(next[0]).toBeCloseTo(0.6);
  });

  it("não muta os arrays originais", () => {
    const peaks = [0.9];
    const values = [0.1];
    decayPeaks(peaks, values, 0.5);
    expect(peaks).toEqual([0.9]);
    expect(values).toEqual([0.1]);
  });

  it("picos ausentes começam do valor", () => {
    expect(decayPeaks([], [0.5, 0.3], 0.016)).toEqual([0.5, 0.3]);
  });
});

describe("hexToRgba", () => {
  it("converte hex válido", () => {
    expect(hexToRgba("#286CF0", 0.5)).toBe("rgba(40, 108, 240, 0.5)");
    expect(hexToRgba("0A0A0A", 1)).toBe("rgba(10, 10, 10, 1)");
  });

  it("hex inválido cai em branco", () => {
    expect(hexToRgba("azul", 0.2)).toBe("rgba(255, 255, 255, 0.2)");
  });

  it("clampa alpha", () => {
    expect(hexToRgba("#000000", 5)).toBe("rgba(0, 0, 0, 1)");
  });

  it("cor transparente permanece invisível, sem virar branco", () => {
    expect(hexToRgba("#286CF000", 0.9)).toBe("rgba(40, 108, 240, 0)");
  });

  it("combina o alfa do hex com o alfa pedido", () => {
    expect(hexToRgba("#286CF080", 0.5)).toBe("rgba(40, 108, 240, 0.251)");
    expect(hexToRgba("#286CF0FF", 0.5)).toBe("rgba(40, 108, 240, 0.5)");
  });
});

describe("partículas", () => {
  const base: Particle = spawnParticle({
    x: 100,
    y: 100,
    angle: 0,
    speed: 50,
    life: 1,
    size: 2,
    colorIndex: 1,
  });

  it("spawn direcional converte ângulo em velocidade", () => {
    expect(base.vx).toBeCloseTo(50);
    expect(base.vy).toBeCloseTo(0);
    const up = spawnParticle({
      x: 0,
      y: 0,
      angle: Math.PI / 2,
      speed: 10,
      life: 1,
      size: 1,
      colorIndex: 0,
    });
    expect(up.vx).toBeCloseTo(0);
    expect(up.vy).toBeCloseTo(10);
  });

  it("spawn clampa vida/tamanho/colorIndex mínimos", () => {
    const p = spawnParticle({
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      life: -1,
      size: -2,
      colorIndex: -3,
    });
    expect(p.life).toBeGreaterThan(0);
    expect(p.size).toBeGreaterThan(0);
    expect(p.colorIndex).toBe(0);
  });

  it("integrate avança posição e reduz vida sem mutar a original", () => {
    const next = integrate(base, 0.5, 1);
    expect(next.x).toBeCloseTo(125);
    expect(next.life).toBeCloseTo(0.5);
    expect(next).not.toBe(base);
    expect(base.x).toBe(100);
    expect(base.life).toBe(1);
  });

  it("drag reduz a velocidade ao longo do tempo", () => {
    const next = integrate(base, 1, 0.5);
    expect(Math.abs(next.vx)).toBeLessThan(Math.abs(base.vx));
  });

  it("dt negativo não altera a partícula", () => {
    const next = integrate(base, -1);
    expect(next.x).toBe(base.x);
    expect(next.life).toBe(base.life);
  });

  it("isAlive e particleAlpha seguem a vida", () => {
    expect(isAlive(base)).toBe(true);
    const dead = integrate(base, 2);
    expect(isAlive(dead)).toBe(false);
    expect(particleAlpha(base)).toBe(1);
    expect(particleAlpha(integrate(base, 0.5))).toBeCloseTo(0.5);
    expect(particleAlpha(dead)).toBe(0);
  });
});
