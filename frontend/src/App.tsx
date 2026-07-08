/**
 * Composição do audioWave: providers globais, boot (persistência + dados da
 * API) e layout — header, canvas central, painel lateral e player embaixo.
 * O app funciona mesmo com a API offline (presets/projetos ficam vazios).
 */
import { useEffect, useRef, useState } from "react";
import { Badge, ThemeToggle, ToastProvider, useToast } from "./ui";
import { initPersistence, useAppStore } from "./state";
import { EngineProvider } from "./features/engine/EngineContext";
import { UploadScreen } from "./features/upload/UploadScreen";
import { VisualizerCanvas } from "./features/visualizer/VisualizerCanvas";
import { ControlsPanel } from "./features/controls/ControlsPanel";
import { PlayerBar } from "./features/player/PlayerBar";
import { ExportDialog } from "./features/export/ExportDialog";
import { ProjectsMenu } from "./features/projects/ProjectsMenu";
import "./App.css";

function AppShell() {
  const toast = useToast();
  const audioFileName = useAppStore((s) => s.audioFileName);
  const duration = useAppStore((s) => s.duration);
  const [exportOpen, setExportOpen] = useState(false);
  const bootedRef = useRef(false);

  // Restaura e autosalva o estado do editor (localStorage).
  useEffect(() => initPersistence(useAppStore), []);

  // Carrega presets e projetos; API offline não bloqueia o editor.
  useEffect(() => {
    if (bootedRef.current) {
      return;
    }
    bootedRef.current = true;
    const boot = async (): Promise<void> => {
      const { loadPresets, loadProjects } = useAppStore.getState();
      await Promise.all([loadPresets(), loadProjects()]);
      const { error, clearError } = useAppStore.getState();
      if (error) {
        clearError();
        toast.info(
          "API indisponível",
          "Presets e projetos salvos estão desativados, mas o editor continua funcionando.",
        );
      }
    };
    void boot();
  }, [toast]);

  const hasAudio = duration > 0;

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1 className="app__title">audioWave</h1>
          {audioFileName ? <Badge tone="primary">{audioFileName}</Badge> : null}
        </div>
        <div className="app__actions">
          <ProjectsMenu />
          <ThemeToggle />
        </div>
      </header>

      {hasAudio ? (
        <>
          <main className="app__editor">
            <VisualizerCanvas />
            <ControlsPanel />
          </main>
          <PlayerBar onOpenExport={() => setExportOpen(true)} />
        </>
      ) : (
        <main className="app__main">
          <UploadScreen />
        </main>
      )}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <EngineProvider>
        <AppShell />
      </EngineProvider>
    </ToastProvider>
  );
}

export default App;
