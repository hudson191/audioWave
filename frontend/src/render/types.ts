/**
 * Tipos internos do motor de render.
 *
 * CONVENÇÃO DE INJEÇÃO DE SETTINGS: toda cena do motor implementa
 * `RenderScene`, que estende o contrato `Scene` (shared/types) com
 * `setSettings`. O RenderEngine chama `setSettings` imediatamente após
 * criar a cena (antes de `init`) e novamente sempre que o app chama
 * `RenderEngine.setSettings`. As cenas leem `sensitivity`/`intensity`
 * do último settings recebido a cada `update`.
 */
import type { Scene, SceneSettings } from "../shared/types";

export interface RenderScene extends Scene {
  /** Recebe settings (já validados/clampados pelo engine). */
  setSettings(settings: SceneSettings): void;
  /**
   * Cenas que suportam imagem central (ex.: osciloscópio) implementam
   * este método opcional; o engine repassa a imagem corrente ao criar a
   * cena e sempre que RenderEngine.setCenterImage é chamado.
   */
  setCenterImage?(image: HTMLImageElement | null): void;
}
