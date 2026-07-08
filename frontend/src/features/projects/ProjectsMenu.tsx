/**
 * Menu de projetos no header: salvar projeto, abrir projetos salvos
 * (Select) e excluir o projeto aberto (com confirmação).
 */
import { useState } from "react";
import { Button, Dialog, Select, useToast } from "../../ui";
import { useAppStore } from "../../state";
import { SaveProjectDialog } from "./SaveProjectDialog";

/** Consome o erro corrente do store (se houver) e devolve a mensagem. */
function takeStoreError(): string | null {
  const { error, clearError } = useAppStore.getState();
  if (error) {
    clearError();
    return error;
  }
  return null;
}

export function ProjectsMenu() {
  const toast = useToast();
  const projects = useAppStore((s) => s.projects);
  const project = useAppStore((s) => s.project);
  const loadProject = useAppStore((s) => s.loadProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleOpen(id: string): Promise<void> {
    if (!id || busy) {
      return;
    }
    setBusy(true);
    await loadProject(id);
    setBusy(false);
    const error = takeStoreError();
    if (error) {
      toast.error("Erro ao abrir projeto", error);
      return;
    }
    const opened = useAppStore.getState().project;
    toast.success("Projeto carregado", opened?.name ?? "");
  }

  async function handleDelete(): Promise<void> {
    if (!project || busy) {
      return;
    }
    const name = project.name;
    setBusy(true);
    await deleteProject(project.id);
    setBusy(false);
    setConfirmOpen(false);
    const error = takeStoreError();
    if (error) {
      toast.error("Erro ao excluir projeto", error);
      return;
    }
    toast.success("Projeto excluído", name);
  }

  return (
    <div className="projects-menu">
      <Select
        aria-label="Abrir projeto salvo"
        value={project?.id ?? ""}
        onChange={(event) => {
          void handleOpen(event.target.value);
        }}
        disabled={busy || projects.length === 0}
      >
        <option value="" disabled>
          {projects.length === 0 ? "Nenhum projeto salvo" : "Abrir projeto…"}
        </option>
        {projects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>

      <Button
        variant="solid"
        onClick={() => setSaveOpen(true)}
        disabled={busy}
        aria-label="Salvar projeto"
      >
        Salvar projeto
      </Button>

      {project ? (
        <Button
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          aria-label={`Excluir projeto ${project.name}`}
        >
          Excluir
        </Button>
      ) : null}

      <SaveProjectDialog open={saveOpen} onClose={() => setSaveOpen(false)} />

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Excluir projeto"
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="solid"
              onClick={() => {
                void handleDelete();
              }}
              disabled={busy}
            >
              {busy ? "Excluindo…" : "Excluir"}
            </Button>
          </>
        }
      >
        <p>
          Tem certeza de que deseja excluir o projeto{" "}
          <strong>{project?.name ?? ""}</strong>? Essa ação não pode ser
          desfeita.
        </p>
      </Dialog>
    </div>
  );
}
