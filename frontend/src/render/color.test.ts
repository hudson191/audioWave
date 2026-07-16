import { describe, expect, it } from "vitest";
import {
  HEX_COLOR_RE,
  TRANSPARENT_COLOR,
  isTransparent,
  parseHex,
  toOpaqueHex,
  withTransparency,
} from "./color";

describe("HEX_COLOR_RE", () => {
  it("aceita #RGB, #RGBA, #RRGGBB e #RRGGBBAA", () => {
    expect(HEX_COLOR_RE.test("#fff")).toBe(true);
    expect(HEX_COLOR_RE.test("#fff0")).toBe(true);
    expect(HEX_COLOR_RE.test("#286CF0")).toBe(true);
    expect(HEX_COLOR_RE.test("#286CF000")).toBe(true);
  });

  it("rejeita formatos inválidos", () => {
    expect(HEX_COLOR_RE.test("azul")).toBe(false);
    expect(HEX_COLOR_RE.test("#12345")).toBe(false);
    expect(HEX_COLOR_RE.test("#1234567")).toBe(false);
    expect(HEX_COLOR_RE.test("286CF0")).toBe(false);
  });
});

describe("parseHex", () => {
  it("lê #RRGGBB como opaco", () => {
    expect(parseHex("#286CF0")).toEqual({ r: 40, g: 108, b: 240, a: 1 });
  });

  it("lê o canal alfa de #RRGGBBAA", () => {
    expect(parseHex("#286CF000")).toEqual({ r: 40, g: 108, b: 240, a: 0 });
    expect(parseHex("#286CF0FF")).toEqual({ r: 40, g: 108, b: 240, a: 1 });
  });

  it("expande formatos curtos", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex("#f00f")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex("#f000")).toEqual({ r: 255, g: 0, b: 0, a: 0 });
  });

  it("aceita hex sem '#'", () => {
    expect(parseHex("0A0A0A")).toEqual({ r: 10, g: 10, b: 10, a: 1 });
  });

  it("hex inválido retorna null", () => {
    expect(parseHex("azul")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
  });
});

describe("isTransparent", () => {
  it("verdadeiro apenas com alfa zero", () => {
    expect(isTransparent(TRANSPARENT_COLOR)).toBe(true);
    expect(isTransparent("#286CF000")).toBe(true);
    expect(isTransparent("#286CF0")).toBe(false);
    expect(isTransparent("#286CF001")).toBe(false);
  });

  it("hex inválido não é transparente", () => {
    expect(isTransparent("azul")).toBe(false);
  });
});

describe("toOpaqueHex", () => {
  it("remove o canal alfa preservando o matiz", () => {
    expect(toOpaqueHex("#286CF000")).toBe("#286CF0");
    expect(toOpaqueHex("#286CF0")).toBe("#286CF0");
  });

  it("expande formatos curtos", () => {
    expect(toOpaqueHex("#f00")).toBe("#ff0000");
    expect(toOpaqueHex("#f000")).toBe("#ff0000");
  });

  it("hex inválido cai em branco", () => {
    expect(toOpaqueHex("azul")).toBe("#FFFFFF");
  });
});

describe("withTransparency", () => {
  it("liga a transparência preservando o matiz", () => {
    expect(withTransparency("#286CF0", true)).toBe("#286CF000");
  });

  it("desliga voltando ao hex opaco", () => {
    expect(withTransparency("#286CF000", false)).toBe("#286CF0");
  });

  it("faz round-trip sem perder a cor", () => {
    const original = "#8C62FF";
    expect(withTransparency(withTransparency(original, true), false)).toBe(
      original,
    );
  });
});
