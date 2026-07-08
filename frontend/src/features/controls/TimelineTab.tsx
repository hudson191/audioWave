/**
 * Aba Timeline: lista de blocos (cena por trecho), formulário de novo
 * bloco com validação (inclusive overlap) e remoção.
 */
import { useMemo, useState } from "react";
import { Button, Field, Input, SectionTitle, Select } from "../../ui";
import { sceneRegistry } from "../../render";
import { clampBlock, insertBlock, useAppStore } from "../../state";
import { formatTime } from "../player/formatTime";
import { buildTimelineBlock, makeBlockId } from "./timelineForm";
import type { TimelineFormValues } from "./timelineForm";

export function TimelineTab() {
  const timeline = useAppStore((s) => s.timeline);
  const duration = useAppStore((s) => s.duration);
  const addTimelineBlock = useAppStore((s) => s.addTimelineBlock);
  const removeTimelineBlock = useAppStore((s) => s.removeTimelineBlock);
  const scenes = useMemo(() => sceneRegistry.list(), []);
  const sceneNames = useMemo(
    () => new Map(scenes.map((scene) => [scene.id, scene.name])),
    [scenes],
  );

  const [form, setForm] = useState<TimelineFormValues>({
    sceneId: scenes[0]?.id ?? "bars",
    start: "",
    end: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  function handleAdd(): void {
    const built = buildTimelineBlock(form, makeBlockId());
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    const block = duration > 0 ? clampBlock(built.block, duration) : built.block;
    if (block.end <= block.start) {
      setFormError("O bloco fica fora da duração do áudio.");
      return;
    }
    const result = insertBlock(timeline, block);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    addTimelineBlock(block);
    setForm((prev) => ({ ...prev, start: "", end: "" }));
  }

  return (
    <div className="tab-panel">
      <SectionTitle>Blocos</SectionTitle>
      {timeline.length === 0 ? (
        <p className="empty-state">
          Sem blocos: a cena escolhida na aba Visual vale para o vídeo inteiro.
        </p>
      ) : (
        <ul className="timeline-list">
          {timeline.map((block) => (
            <li key={block.id} className="timeline-item">
              <span className="timeline-item__scene">
                {sceneNames.get(block.sceneId) ?? block.sceneId}
              </span>
              <span className="timeline-item__range">
                {formatTime(block.start)} – {formatTime(block.end)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remover bloco de ${formatTime(block.start)} a ${formatTime(block.end)}`}
                onClick={() => removeTimelineBlock(block.id)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Novo bloco</SectionTitle>
      <Field label="Cena" htmlFor="timeline-scene">
        <Select
          id="timeline-scene"
          value={form.sceneId}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, sceneId: event.target.value }))
          }
        >
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="timeline-form-row">
        <Field label="Início (s)" htmlFor="timeline-start">
          <Input
            id="timeline-start"
            inputMode="decimal"
            placeholder="0"
            value={form.start}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, start: event.target.value }))
            }
          />
        </Field>
        <Field label="Fim (s)" htmlFor="timeline-end">
          <Input
            id="timeline-end"
            inputMode="decimal"
            placeholder="30"
            value={form.end}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, end: event.target.value }))
            }
          />
        </Field>
      </div>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <Button variant="solid" onClick={handleAdd}>
        Adicionar bloco
      </Button>
      <p className="hint">
        Cada bloco define qual cena aparece naquele trecho do vídeo. Blocos não
        podem se sobrepor.
      </p>
    </div>
  );
}
