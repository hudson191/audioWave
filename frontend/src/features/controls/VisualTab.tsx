/**
 * Aba Visual: cena (via sceneRegistry), paleta com swatches, sliders de
 * sensibilidade/intensidade, caixa do elemento (posição/tamanho em % do
 * vídeo) e imagens (fundo + centro do osciloscópio).
 */
import { useMemo } from "react";
import { Field, SectionTitle, Slider, cx } from "../../ui";
import {
  CUSTOM_PALETTE_ID,
  DEFAULT_CUSTOM_COLORS,
  DEFAULT_ELEMENT,
  ELEMENT_POS_MAX,
  ELEMENT_POS_MIN,
  ELEMENT_SIZE_MAX,
  ELEMENT_SIZE_MIN,
  INTENSITY_MAX,
  INTENSITY_MIN,
  MAX_CUSTOM_COLORS,
  PALETTES,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  isTransparent,
  sceneRegistry,
  toOpaqueHex,
  withTransparency,
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
/** Swatches mostrados no card "Custom" quando ainda não há cores próprias. */
const CUSTOM_CARD_SWATCHES = [...DEFAULT_CUSTOM_COLORS];

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

  const isCustom = settings.paletteId === CUSTOM_PALETTE_ID;
  const customColors = settings.customColors ?? [...DEFAULT_CUSTOM_COLORS];

  const selectCustom = (): void => {
    setSettings({
      paletteId: CUSTOM_PALETTE_ID,
      customColors: settings.customColors ?? [...DEFAULT_CUSTOM_COLORS],
    });
  };

  const setCustomColorAt = (index: number, color: string): void => {
    const next = [...customColors];
    next[index] = color;
    setSettings({ paletteId: CUSTOM_PALETTE_ID, customColors: next });
  };

  /** Alterna o alfa da cor entre 0 e opaco, preservando o matiz escolhido. */
  const toggleTransparentAt = (index: number): void => {
    const current = customColors[index] ?? "#FFFFFF";
    setCustomColorAt(index, withTransparency(current, !isTransparent(current)));
  };

  const addCustomColor = (): void => {
    if (customColors.length >= MAX_CUSTOM_COLORS) return;
    setSettings({
      paletteId: CUSTOM_PALETTE_ID,
      customColors: [...customColors, "#FFFFFF"],
    });
  };

  const removeCustomColor = (index: number): void => {
    if (customColors.length <= 1) return;
    setSettings({
      paletteId: CUSTOM_PALETTE_ID,
      customColors: customColors.filter((_, i) => i !== index),
    });
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
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          aria-label="Paleta customizada"
          className={cx("palette-card", isCustom && "palette-card--active")}
          onClick={selectCustom}
        >
          <span className="palette-card__swatches" aria-hidden="true">
            {(isCustom ? customColors : CUSTOM_CARD_SWATCHES).map((color, i) => (
              <span
                key={`${color}-${i}`}
                className={cx(
                  "palette-card__swatch",
                  isTransparent(color) && "palette-card__swatch--transparent",
                )}
                style={isTransparent(color) ? undefined : { background: color }}
              />
            ))}
          </span>
          <span className="palette-card__name">Custom</span>
        </button>
      </div>

      {isCustom ? (
        <div className="custom-colors">
          <div className="custom-colors__list">
            {customColors.map((color, i) => {
              const transparent = isTransparent(color);
              return (
                <div
                  className={cx(
                    "custom-colors__item",
                    transparent && "custom-colors__item--transparent",
                  )}
                  key={i}
                >
                  <input
                    type="color"
                    className="custom-colors__picker"
                    value={toOpaqueHex(color)}
                    aria-label={`Cor ${i + 1} da paleta customizada`}
                    onChange={(e) =>
                      setCustomColorAt(
                        i,
                        withTransparency(e.target.value, transparent),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="custom-colors__alpha"
                    aria-pressed={transparent}
                    aria-label={`Cor ${i + 1} transparente`}
                    title={transparent ? "Tornar opaca" : "Tornar transparente"}
                    onClick={() => toggleTransparentAt(i)}
                  />
                  {customColors.length > 1 ? (
                    <button
                      type="button"
                      className="custom-colors__remove"
                      aria-label={`Remover cor ${i + 1}`}
                      onClick={() => removeCustomColor(i)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
            {customColors.length < MAX_CUSTOM_COLORS ? (
              <button
                type="button"
                className="custom-colors__add"
                aria-label="Adicionar cor"
                onClick={addCustomColor}
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

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
