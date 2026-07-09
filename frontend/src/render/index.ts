/**
 * Barrel do motor de render (frontend/src/render).
 */
export { RenderEngine } from "./renderEngine";
export { sceneRegistry, FALLBACK_SCENE_ID } from "./sceneRegistry";
export {
  PALETTES,
  getPalette,
  DEFAULT_PALETTE_ID,
  CANVAS_BACKGROUND,
} from "./palettes";
export {
  DEFAULT_SETTINGS,
  DEFAULT_ELEMENT,
  clampSettings,
  clampElementBox,
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  INTENSITY_MIN,
  INTENSITY_MAX,
  ELEMENT_POS_MIN,
  ELEMENT_POS_MAX,
  ELEMENT_SIZE_MIN,
  ELEMENT_SIZE_MAX,
} from "./settings";
export type { RenderScene } from "./types";
