/**
 * Defaults e validação de SceneSettings (boundary do motor de render).
 */
import type { SceneSettings } from "../shared/types";
import { clamp } from "./math";

export const SENSITIVITY_MIN = 0.1;
export const SENSITIVITY_MAX = 3;
export const INTENSITY_MIN = 0.1;
export const INTENSITY_MAX = 2;

export const DEFAULT_SETTINGS: SceneSettings = {
  sensitivity: 1,
  intensity: 1,
  paletteId: "eyris",
};

/**
 * Valida e clampa settings vindos de fora do módulo.
 * Valores não-finitos caem no default. Retorna um NOVO objeto.
 */
export function clampSettings(input: SceneSettings): SceneSettings {
  const sensitivity = Number.isFinite(input.sensitivity)
    ? clamp(input.sensitivity, SENSITIVITY_MIN, SENSITIVITY_MAX)
    : DEFAULT_SETTINGS.sensitivity;
  const intensity = Number.isFinite(input.intensity)
    ? clamp(input.intensity, INTENSITY_MIN, INTENSITY_MAX)
    : DEFAULT_SETTINGS.intensity;
  const paletteId =
    typeof input.paletteId === "string" && input.paletteId.length > 0
      ? input.paletteId
      : DEFAULT_SETTINGS.paletteId;
  return { sensitivity, intensity, paletteId };
}
