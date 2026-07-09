/**
 * Barrel do motor de render (frontend/src/render).
 */
export { RenderEngine } from "./renderEngine";
export { OfflineRenderer } from "./offlineRenderer";
export type { OfflineRendererOptions } from "./offlineRenderer";
export { sceneRegistry, FALLBACK_SCENE_ID } from "./sceneRegistry";
export {
  PALETTES,
  getPalette,
  resolvePalette,
  buildCustomPalette,
  DEFAULT_PALETTE_ID,
  CUSTOM_PALETTE_ID,
  DEFAULT_CUSTOM_COLORS,
  CANVAS_BACKGROUND,
} from "./palettes";
export {
  DEFAULT_SETTINGS,
  DEFAULT_ELEMENT,
  clampSettings,
  clampElementBox,
  sanitizeCustomColors,
  SENSITIVITY_MIN,
  SENSITIVITY_MAX,
  INTENSITY_MIN,
  INTENSITY_MAX,
  ELEMENT_POS_MIN,
  ELEMENT_POS_MAX,
  ELEMENT_SIZE_MIN,
  ELEMENT_SIZE_MAX,
  MAX_CUSTOM_COLORS,
  HEX_COLOR_RE,
} from "./settings";
export type { RenderScene } from "./types";
