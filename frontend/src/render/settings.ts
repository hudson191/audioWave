/**
 * Defaults e validação de SceneSettings (boundary do motor de render).
 */
import type { ElementBox, SceneSettings } from "../shared/types";
import { clamp } from "./math";

export const SENSITIVITY_MIN = 0.1;
export const SENSITIVITY_MAX = 3;
export const INTENSITY_MIN = 0.1;
export const INTENSITY_MAX = 2;

/** Limites da caixa do elemento (porcentagem do canvas). */
export const ELEMENT_POS_MIN = 0;
export const ELEMENT_POS_MAX = 100;
export const ELEMENT_SIZE_MIN = 5;
export const ELEMENT_SIZE_MAX = 100;

/** Máximo de cores na paleta customizada. */
export const MAX_CUSTOM_COLORS = 6;
/** Cor hex válida: #RGB ou #RRGGBB. */
export const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Filtra cores hex válidas e limita a quantidade. Retorna NOVO array. */
export function sanitizeCustomColors(
  colors: readonly string[] | undefined,
): string[] | undefined {
  if (!colors) {
    return undefined;
  }
  const valid = colors
    .filter((c): c is string => typeof c === "string" && HEX_COLOR_RE.test(c))
    .slice(0, MAX_CUSTOM_COLORS);
  return valid;
}

export const DEFAULT_ELEMENT: ElementBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

export const DEFAULT_SETTINGS: SceneSettings = {
  sensitivity: 1,
  intensity: 1,
  paletteId: "eyris",
  element: { ...DEFAULT_ELEMENT },
};

/**
 * Valida e clampa a caixa do elemento (porcentagens). Entrada ausente ou
 * com campos não-finitos cai no default (tela cheia). Retorna NOVO objeto.
 */
export function clampElementBox(input: ElementBox | undefined): ElementBox {
  if (!input) {
    return { ...DEFAULT_ELEMENT };
  }
  const field = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? clamp(value, min, max) : fallback;
  return {
    x: field(input.x, ELEMENT_POS_MIN, ELEMENT_POS_MAX, DEFAULT_ELEMENT.x),
    y: field(input.y, ELEMENT_POS_MIN, ELEMENT_POS_MAX, DEFAULT_ELEMENT.y),
    width: field(
      input.width,
      ELEMENT_SIZE_MIN,
      ELEMENT_SIZE_MAX,
      DEFAULT_ELEMENT.width,
    ),
    height: field(
      input.height,
      ELEMENT_SIZE_MIN,
      ELEMENT_SIZE_MAX,
      DEFAULT_ELEMENT.height,
    ),
  };
}

/**
 * Valida e clampa settings vindos de fora do módulo.
 * Valores não-finitos caem no default. Retorna um NOVO objeto
 * (sempre com `element` normalizado presente).
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
  const customColors = sanitizeCustomColors(input.customColors);
  return {
    sensitivity,
    intensity,
    paletteId,
    element: clampElementBox(input.element),
    ...(customColors ? { customColors } : {}),
  };
}
