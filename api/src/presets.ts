/**
 * Seed read-only de presets visuais (GET /api/presets).
 * Cobre as cenas "bars", "waveform" e "particles" e as paletas
 * "eyris", "violet", "emerald" e "sunset" usadas pelo motor de render.
 */
import type { VisualPreset } from "./types.js";

export const VISUAL_PRESETS: readonly VisualPreset[] = [
  {
    id: "eyris-bars",
    name: "Barras Eyris",
    sceneId: "bars",
    settings: { sensitivity: 1, intensity: 1, paletteId: "eyris" },
  },
  {
    id: "violet-bars",
    name: "Barras Violeta",
    sceneId: "bars",
    settings: { sensitivity: 1.4, intensity: 1.3, paletteId: "violet" },
  },
  {
    id: "emerald-wave",
    name: "Onda Esmeralda",
    sceneId: "waveform",
    settings: { sensitivity: 1, intensity: 0.9, paletteId: "emerald" },
  },
  {
    id: "sunset-wave",
    name: "Onda Pôr do Sol",
    sceneId: "waveform",
    settings: { sensitivity: 1.2, intensity: 1.1, paletteId: "sunset" },
  },
  {
    id: "violet-particles",
    name: "Partículas Violeta",
    sceneId: "particles",
    settings: { sensitivity: 1.5, intensity: 1.4, paletteId: "violet" },
  },
  {
    id: "sunset-particles",
    name: "Partículas Solares",
    sceneId: "particles",
    settings: { sensitivity: 1.1, intensity: 1.6, paletteId: "sunset" },
  },
  {
    id: "eyris-particles",
    name: "Pulso Eyris",
    sceneId: "particles",
    settings: { sensitivity: 1.8, intensity: 1.2, paletteId: "eyris" },
  },
  {
    id: "emerald-bars",
    name: "Barras Esmeralda",
    sceneId: "bars",
    settings: { sensitivity: 0.8, intensity: 0.8, paletteId: "emerald" },
  },
];
