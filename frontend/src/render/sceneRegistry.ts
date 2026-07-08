/**
 * Registro de cenas plugáveis. Ids desconhecidos caem no fallback "bars".
 */
import type { RenderScene } from "./types";
import { BarsScene } from "./scenes/bars";
import { WaveformScene } from "./scenes/waveform";
import { ParticlesScene } from "./scenes/particles";

export const FALLBACK_SCENE_ID = "bars";

const factories: Record<string, () => RenderScene> = {
  bars: () => new BarsScene(),
  waveform: () => new WaveformScene(),
  particles: () => new ParticlesScene(),
};

export const sceneRegistry = {
  /** Lista as cenas disponíveis (id + nome exibido). */
  list(): { id: string; name: string }[] {
    return Object.keys(factories).map((id) => {
      const scene = factories[id]();
      return { id: scene.id, name: scene.name };
    });
  },

  /** Cria uma nova instância da cena; id desconhecido → "bars". */
  create(id: string): RenderScene {
    const factory = factories[id] ?? factories[FALLBACK_SCENE_ID];
    return factory();
  },
};
