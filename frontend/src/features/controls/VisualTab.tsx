/**
 * Aba Visual: cena (via sceneRegistry), paleta com swatches e
 * sliders de sensibilidade/intensidade.
 */
import { useMemo } from "react";
import { Field, SectionTitle, Slider, cx } from "../../ui";
import {
  INTENSITY_MAX,
  INTENSITY_MIN,
  PALETTES,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  sceneRegistry,
} from "../../render";
import { useAppStore } from "../../state";

const PALETTE_LABELS: Record<string, string> = {
  eyris: "Eyris",
  violet: "Violeta",
  emerald: "Esmeralda",
  sunset: "Pôr do sol",
};

const SLIDER_STEP = 0.05;

export function VisualTab() {
  const sceneId = useAppStore((s) => s.sceneId);
  const settings = useAppStore((s) => s.settings);
  const setScene = useAppStore((s) => s.setScene);
  const setSettings = useAppStore((s) => s.setSettings);
  const scenes = useMemo(() => sceneRegistry.list(), []);
  const palettes = useMemo(() => Object.entries(PALETTES), []);

  return (
    <div className="tab-panel">
      <SectionTitle>Cena</SectionTitle>
      <div className="scene-grid" role="radiogroup" aria-label="Cena do visualizador">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            role="radio"
            aria-checked={scene.id === sceneId}
            className={cx(
              "scene-card",
              scene.id === sceneId && "scene-card--active",
            )}
            onClick={() => setScene(scene.id)}
          >
            {scene.name}
          </button>
        ))}
      </div>

      <SectionTitle>Paleta</SectionTitle>
      <div className="palette-grid" role="radiogroup" aria-label="Paleta de cores">
        {palettes.map(([id, palette]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === settings.paletteId}
            aria-label={`Paleta ${PALETTE_LABELS[id] ?? id}`}
            className={cx(
              "palette-card",
              id === settings.paletteId && "palette-card--active",
            )}
            onClick={() => setSettings({ paletteId: id })}
          >
            <span className="palette-card__swatches" aria-hidden="true">
              {palette.colors.map((color) => (
                <span
                  key={color}
                  className="palette-card__swatch"
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="palette-card__name">
              {PALETTE_LABELS[id] ?? id}
            </span>
          </button>
        ))}
      </div>

      <SectionTitle>Ajustes</SectionTitle>
      <Field label="Sensibilidade" htmlFor="visual-sensitivity">
        <Slider
          id="visual-sensitivity"
          value={settings.sensitivity}
          onChange={(value) => setSettings({ sensitivity: value })}
          min={SENSITIVITY_MIN}
          max={SENSITIVITY_MAX}
          step={SLIDER_STEP}
          label="Sensibilidade da resposta ao áudio"
          showValue
          formatValue={(value) => value.toFixed(2)}
        />
      </Field>
      <Field label="Intensidade" htmlFor="visual-intensity">
        <Slider
          id="visual-intensity"
          value={settings.intensity}
          onChange={(value) => setSettings({ intensity: value })}
          min={INTENSITY_MIN}
          max={INTENSITY_MAX}
          step={SLIDER_STEP}
          label="Intensidade do efeito"
          showValue
          formatValue={(value) => value.toFixed(2)}
        />
      </Field>
    </div>
  );
}
