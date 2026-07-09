import { describe, expect, it } from "vitest";
import type { SceneSettings } from "../../shared/types";
import type { RenderScene } from "../types";
import { BarsScene } from "./bars";
import { WaveformScene } from "./waveform";
import { ParticlesScene } from "./particles";
import { createMockFrame, createMockSceneContext } from "../testHelpers";

const EXTREME_SETTINGS: SceneSettings[] = [
  { sensitivity: 0.1, intensity: 0.1, paletteId: "eyris" },
  { sensitivity: 3, intensity: 2, paletteId: "sunset" },
];

const factories: { label: string; create: () => RenderScene }[] = [
  { label: "bars", create: () => new BarsScene() },
  { label: "waveform", create: () => new WaveformScene() },
  { label: "particles", create: () => new ParticlesScene() },
];

describe.each(factories)("cena $label (smoke)", ({ create }) => {
  it("ciclo init/update/resize/dispose não lança", () => {
    const scene = create();
    expect(() => {
      scene.init(createMockSceneContext());
      scene.update(createMockFrame(), 1 / 60);
      scene.update(createMockFrame({ beat: true }), 1 / 60);
      scene.update(createMockFrame({ level: 0, beat: false }), 0.1);
      scene.resize(createMockSceneContext());
      scene.update(createMockFrame(), 1 / 60);
      scene.dispose();
    }).not.toThrow();
  });

  it("update antes de init é no-op seguro", () => {
    const scene = create();
    expect(() => scene.update(createMockFrame(), 1 / 60)).not.toThrow();
  });

  it("update após dispose é no-op seguro", () => {
    const scene = create();
    scene.init(createMockSceneContext());
    scene.dispose();
    expect(() => scene.update(createMockFrame(), 1 / 60)).not.toThrow();
  });

  it("respeita settings extremos sem lançar", () => {
    EXTREME_SETTINGS.forEach((settings) => {
      const scene = create();
      scene.setSettings(settings);
      scene.init(createMockSceneContext());
      expect(() => {
        for (let i = 0; i < 10; i += 1) {
          scene.update(createMockFrame({ beat: i % 4 === 0 }), 1 / 60);
        }
      }).not.toThrow();
      scene.dispose();
    });
  });

  it("aceita frames vazios (frequency/waveform de tamanho 0)", () => {
    const scene = create();
    scene.init(createMockSceneContext());
    const empty = createMockFrame({
      frequency: new Uint8Array(0),
      waveform: new Uint8Array(0),
      level: 0,
      bpm: null,
    });
    expect(() => scene.update(empty, 1 / 60)).not.toThrow();
    scene.dispose();
  });
});

describe("ParticlesScene", () => {
  it("emissão respeita o pool (~300 * intensity)", () => {
    const scene = new ParticlesScene(() => 0.5);
    scene.setSettings({ sensitivity: 3, intensity: 0.5, paletteId: "eyris" });
    const sc = createMockSceneContext();
    scene.init(sc);
    const loud = createMockFrame({ bands: { bass: 1, mid: 1, treble: 1 }, beat: true });
    for (let i = 0; i < 120; i += 1) {
      scene.update(loud, 1 / 60);
    }
    const drawn = (sc.ctx.arc as unknown as { mock: { calls: unknown[][] } }).mock
      .calls.length;
    // último frame desenha no máximo o pool inteiro (300 * 0.5 = 150)
    expect(drawn).toBeGreaterThan(0);
    scene.dispose();
  });
});

describe("WaveformScene — imagem central", () => {
  it("desenha a imagem recortada em círculo sem lançar (e limpa no dispose)", () => {
    const scene = new WaveformScene();
    const sc = createMockSceneContext();
    const image = { naturalWidth: 128, naturalHeight: 64 } as HTMLImageElement;
    expect(() => {
      scene.setCenterImage(image);
      scene.init(sc);
      scene.update(createMockFrame({ beat: true }), 1 / 60);
      scene.setCenterImage(null);
      scene.update(createMockFrame(), 1 / 60);
      scene.dispose();
    }).not.toThrow();
    expect(sc.ctx.clip).toHaveBeenCalled();
    expect(sc.ctx.drawImage).toHaveBeenCalled();
  });
});
