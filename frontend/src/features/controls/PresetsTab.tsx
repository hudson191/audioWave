/**
 * Aba Presets: lista os presets visuais da API; estado vazio quando
 * a API está indisponível.
 */
import { Button, SectionTitle, useToast } from "../../ui";
import { useAppStore } from "../../state";

export function PresetsTab() {
  const presets = useAppStore((s) => s.presets);
  const applyPreset = useAppStore((s) => s.applyPreset);
  const toast = useToast();

  if (presets.length === 0) {
    return (
      <div className="tab-panel">
        <SectionTitle>Presets</SectionTitle>
        <p className="empty-state">
          Nenhum preset disponível. Verifique se a API está em execução
          (porta 3001) e recarregue a página.
        </p>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <SectionTitle>Presets</SectionTitle>
      <ul className="preset-list">
        {presets.map((preset) => (
          <li key={preset.id} className="preset-item">
            <div className="preset-item__info">
              <span className="preset-item__name">{preset.name}</span>
              <span className="preset-item__meta">
                cena {preset.sceneId} · paleta {preset.settings.paletteId}
              </span>
            </div>
            <Button
              size="sm"
              aria-label={`Aplicar preset ${preset.name}`}
              onClick={() => {
                applyPreset(preset);
                toast.success("Preset aplicado", preset.name);
              }}
            >
              Aplicar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
