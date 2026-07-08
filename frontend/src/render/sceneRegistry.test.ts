import { describe, expect, it } from "vitest";
import { FALLBACK_SCENE_ID, sceneRegistry } from "./sceneRegistry";

describe("sceneRegistry.list", () => {
  it("lista as 3 cenas com id e nome", () => {
    const entries = sceneRegistry.list();
    expect(entries.map((e) => e.id)).toEqual(["bars", "waveform", "particles"]);
    entries.forEach((entry) => {
      expect(entry.name.length).toBeGreaterThan(0);
    });
  });
});

describe("sceneRegistry.create", () => {
  it("cria a cena pelo id", () => {
    expect(sceneRegistry.create("bars").id).toBe("bars");
    expect(sceneRegistry.create("waveform").id).toBe("waveform");
    expect(sceneRegistry.create("particles").id).toBe("particles");
  });

  it("id desconhecido cai no fallback bars", () => {
    expect(FALLBACK_SCENE_ID).toBe("bars");
    expect(sceneRegistry.create("nao-existe").id).toBe("bars");
    expect(sceneRegistry.create("").id).toBe("bars");
  });

  it("retorna instâncias novas a cada chamada", () => {
    expect(sceneRegistry.create("bars")).not.toBe(sceneRegistry.create("bars"));
  });

  it("cenas criadas expõem setSettings além do contrato Scene", () => {
    const scene = sceneRegistry.create("particles");
    expect(typeof scene.setSettings).toBe("function");
    expect(typeof scene.init).toBe("function");
    expect(typeof scene.update).toBe("function");
    expect(typeof scene.resize).toBe("function");
    expect(typeof scene.dispose).toBe("function");
  });
});
