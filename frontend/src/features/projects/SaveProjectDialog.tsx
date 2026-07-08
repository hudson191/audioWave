/**
 * Diálogo de salvamento de projeto: pede o nome e chama saveProject do store.
 * Erros do store são exibidos no próprio campo (e limpos do estado global).
 */
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Dialog, Field, Input, useToast } from "../../ui";
import { useAppStore } from "../../state";

export interface SaveProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaveProjectDialog({ open, onClose }: SaveProjectDialogProps) {
  const toast = useToast();
  const project = useAppStore((s) => s.project);
  const saveProject = useAppStore((s) => s.saveProject);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setFieldError(null);
    }
  }, [open, project]);

  async function handleSave(): Promise<void> {
    if (saving) {
      return;
    }
    setSaving(true);
    await saveProject(name);
    setSaving(false);
    const { error, clearError } = useAppStore.getState();
    if (error) {
      setFieldError(error);
      clearError();
      return;
    }
    toast.success("Projeto salvo", name.trim());
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSave();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Salvar projeto"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="solid"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      <Field
        label="Nome do projeto"
        htmlFor="save-project-name"
        error={fieldError ?? undefined}
      >
        <Input
          id="save-project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Meu vídeo musical"
          autoFocus
        />
      </Field>
      <p className="hint">
        O projeto guarda cena, paleta, ajustes e timeline. Requer a API em
        execução (porta 3001).
      </p>
    </Dialog>
  );
}
