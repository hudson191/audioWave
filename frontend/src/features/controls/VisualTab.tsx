/**
 * Aba Visual: cena (via sceneRegistry), paleta com swatches, sliders de
 * sensibilidade/intensidade, caixa do elemento (posição/tamanho em % do
 * vídeo) e imagens (fundo + centro do osciloscópio).
 */
import { useMemo } from "react";
import { Field, SectionTitle, Slider, cx } from "../../ui";
import {
  DEFAULT_ELEMENT,
  ELEMENT_POS_MAX,
  ELEMENT_POS_MIN,
  ELEMENT_SIZE_MAX,
  ELEMENT_SIZE_MIN,
  INTENSITY_MAX,
  INTENSITY_MIN,
  PALETTES,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  sceneRegistry,
} from "../../render";
import { useAppStore } from "../../state";
import { ImagePicker } from "./ImagePicker";
import type { ElementBox } from "../../shared/types";

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
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);
  const centerImageUrl = useAppStore((s) => s.centerImageUrl);
  const setBackgroundImageUrl = useAppStore((s) => s.setBackgroundImageUrl);
  const setCenterImageUrl = useAppStore((s) => s.setCenterImageUrl);
  const scenes = useMemo(() => sceneRegistry.list(), []);
  const palettes = useMemo(() => Object.entries(PALETTES), []);

  const element = settings.element ?? DEFAULT_ELEMENT;
  const setElement = (partial: Partial<ElementBox>): void => {
    setSettings({ element: { ...element, ...partial } });
  };

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

      <SectionTitle>Elemento</SectionTitle>
      <p className="hint hint--tight">
        Posição e tamanho da visualização em % do vídeo.
      </p>
      <Field label="Posição X" htmlFor="element-x">
        <Slider
          id="element-x"
          value={element.x}
          onChange={(value) => setElement({ x: value })}
          min={ELEMENT_POS_MIN}
          max={ELEMENT_POS_MAX}
          step={1}
          label="Posição horizontal do elemento (%)"
          showValue
          formatValue={(value) => `${Math.round(value)}%`}
        />
      </Field>
      <Field label="Posição Y" htmlFor="element-y">
        <Slider
          id="element-y"
          value={element.y}
          onChange={(value) => setElement({ y: value })}
          min={ELEMENT_POS_MIN}
          max={ELEMENT_POS_MAX}
          step={1}
          label="Posição vertical do elemento (%)"
          showValue
          formatValue={(value) => `${Math.round(value)}%`}
        />
      </Field>
      <Field label="Largura" htmlFor="element-width">
        <Slider
          id="element-width"
          value={element.width}
          onChange={(value) => setElement({ width: value })}
          min={ELEMENT_SIZE_MIN}
          max={ELEMENT_SIZE_MAX}
          step={1}
          label="Largura do elemento (%)"
          showValue
          formatValue={(value) => `${Math.round(value)}%`}
        />
      </Field>
      <Field label="Altura" htmlFor="element-height">
        <Slider
          id="element-height"
          value={element.height}
          onChange={(value) => setElement({ height: value })}
          min={ELEMENT_SIZE_MIN}
          max={ELEMENT_SIZE_MAX}
          step={1}
          label="Altura do elemento (%)"
          showValue
          formatValue={(value) => `${Math.round(value)}%`}
        />
      </Field>

      <SectionTitle>Imagens</SectionTitle>
      <Field label="Imagem de fundo" htmlFor="image-background">
        <ImagePicker
          id="image-background"
          label="Imagem de fundo"
          url={backgroundImageUrl}
          onChange={setBackgroundImageUrl}
        />
      </Field>
      {sceneId === "waveform" ? (
        <Field label="Imagem central" htmlFor="image-center">
          <ImagePicker
            id="image-center"
            label="Imagem central do osciloscópio"
            url={centerImageUrl}
            onChange={setCenterImageUrl}
          />
        </Field>
      ) : null}
    </div>
  );
}
