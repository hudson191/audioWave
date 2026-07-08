/**
 * Paletas de cena derivadas dos tokens --chart-* do design system Eyris
 * (design-system/REFERENCE.md). Fundo do canvas sempre escuro (#0A0A0A),
 * independente do tema do app.
 */
import type { ScenePalette } from "../shared/types";

/** Fundo escuro fixo do canvas (ver REFERENCE.md, seção canvas). */
export const CANVAS_BACKGROUND = "#0A0A0A";

export const DEFAULT_PALETTE_ID = "eyris";

export const PALETTES: Record<string, ScenePalette> = {
  eyris: {
    primary: "#286CF0", // --chart-1
    secondary: "#8C62FF", // --chart-2
    accent: "#05AED3", // --chart-5
    colors: ["#286CF0", "#8C62FF", "#05AED3", "#00C27F"],
    background: CANVAS_BACKGROUND,
  },
  violet: {
    primary: "#8C62FF", // --chart-2 dominante
    secondary: "#286CF0", // --chart-1
    accent: "#05AED3", // --chart-5
    colors: ["#8C62FF", "#286CF0", "#05AED3", "#EB4137"],
    background: CANVAS_BACKGROUND,
  },
  emerald: {
    primary: "#00A85B", // --chart-3
    secondary: "#00C27F", // --chart-6
    accent: "#05AED3", // --chart-5
    colors: ["#00A85B", "#00C27F", "#05AED3", "#286CF0"],
    background: CANVAS_BACKGROUND,
  },
  sunset: {
    primary: "#EB4137", // --chart-4
    secondary: "#FFD400", // amarelo de destaque
    accent: "#8C62FF", // --chart-2
    colors: ["#EB4137", "#FFD400", "#8C62FF", "#286CF0"],
    background: CANVAS_BACKGROUND,
  },
};

/** Retorna a paleta pelo id, com fallback para "eyris". */
export function getPalette(id: string): ScenePalette {
  return PALETTES[id] ?? PALETTES[DEFAULT_PALETTE_ID];
}
