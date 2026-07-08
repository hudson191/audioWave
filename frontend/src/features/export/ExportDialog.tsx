/**
 * Diálogo de exportação: canvas.captureStream(60) + AudioEngine.getMediaStream()
 * → MediaRecorder (webm vp9 → vp8 → genérico). Toca o áudio do início e, ao
 * terminar, baixa audiowave-{nome}.webm automaticamente.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, Field, Progress, Select, useToast } from "../../ui";
import { useAppStore } from "../../state";
import { useEngines } from "../engine/EngineContext";
import { getErrorMessage } from "../common/errors";
import {
  DEFAULT_RESOLUTION_ID,
  EXPORT_RESOLUTIONS,
  applyExportSize,
  buildExportFileName,
  computeExportProgress,
  downloadBlob,
  findResolution,
  pickSupportedMimeType,
} from "./exportUtils";
import "./export.css";

const UNSUPPORTED_MESSAGE =
  "Seu navegador não suporta gravação de vídeo (MediaRecorder). Use uma versão recente do Chrome, Edge ou Firefox.";

interface ActiveRecording {
  recorder: MediaRecorder;
  mimeType: string;
  stopTracks: () => void;
  restoreSize: () => void;
  offEnded: () => void;
}

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { canvasRef, getAudioEngine } = useEngines();
  const toast = useToast();
  const duration = useAppStore((s) => s.duration);
  const currentTime = useAppStore((s) => s.currentTime);
  const exportStatus = useAppStore((s) => s.exportStatus);
  const exportProgress = useAppStore((s) => s.exportProgress);
  const [resolutionId, setResolutionId] = useState(DEFAULT_RESOLUTION_ID);
  const recordingRef = useRef<ActiveRecording | null>(null);
  const chunksRef = useRef<readonly Blob[]>([]);

  const recording = exportStatus === "recording";
  const processing = exportStatus === "processing";
  const busy = recording || processing;

  // progresso via currentTime (atualizado pelo loop do visualizador)
  useEffect(() => {
    if (recording) {
      useAppStore
        .getState()
        .setExportProgress(computeExportProgress(currentTime, duration));
    }
  }, [recording, currentTime, duration]);

  // ao reabrir o diálogo, limpa estado de exportações anteriores
  useEffect(() => {
    if (open && !recordingRef.current) {
      const store = useAppStore.getState();
      if (store.exportStatus === "done" || store.exportStatus === "error") {
        store.setExportStatus("idle");
        store.setExportProgress(0);
      }
    }
  }, [open]);

  /**
   * Encerra a gravação ativa: "done" baixa o vídeo, "cancel" descarta,
   * "error" descarta e fixa exportStatus "error". O status final é decidido
   * SOMENTE pelo finalize (que roda uma única vez, mesmo que o evento stop
   * do recorder chegue depois de uma execução síncrona).
   */
  const finishRecording = useCallback(
    (outcome: "done" | "cancel" | "error"): void => {
      const active = recordingRef.current;
      if (!active) {
        return;
      }
      recordingRef.current = null;
      active.offEnded();
      getAudioEngine().pause();
      const store = useAppStore.getState();

      let finalized = false;
      const finalize = (): void => {
        if (finalized) {
          return;
        }
        finalized = true;
        active.recorder.onstop = null;
        active.stopTracks();
        active.restoreSize();
        if (outcome === "done") {
          const blob = new Blob([...chunksRef.current], {
            type: active.mimeType,
          });
          chunksRef.current = [];
          downloadBlob(
            blob,
            buildExportFileName(useAppStore.getState().audioFileName),
          );
          useAppStore.getState().setExportProgress(1);
          useAppStore.getState().setExportStatus("done");
          toast.success(
            "Exportação concluída",
            "O download do vídeo foi iniciado.",
          );
        } else {
          chunksRef.current = [];
          useAppStore.getState().setExportProgress(0);
          useAppStore
            .getState()
            .setExportStatus(outcome === "error" ? "error" : "idle");
        }
      };

      if (outcome === "done") {
        store.setExportStatus("processing");
      }
      active.recorder.onstop = finalize;
      try {
        if (active.recorder.state !== "inactive") {
          active.recorder.stop();
        } else {
          finalize();
        }
      } catch (error: unknown) {
        console.error("[export] falha ao parar a gravação:", error);
        finalize();
      }
    },
    [getAudioEngine, toast],
  );

  // cancelamento seguro se o componente desmontar durante uma gravação
  useEffect(() => {
    return () => {
      finishRecording("cancel");
    };
  }, [finishRecording]);

  function failUnsupported(): void {
    toast.error("Exportação indisponível", UNSUPPORTED_MESSAGE);
    useAppStore.getState().setExportStatus("error");
  }

  function startExport(): void {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) {
      toast.error(
        "Exportação indisponível",
        "Carregue um áudio antes de exportar o vídeo.",
      );
      return;
    }
    if (
      typeof MediaRecorder === "undefined" ||
      typeof canvas.captureStream !== "function"
    ) {
      failUnsupported();
      return;
    }
    const mimeType = pickSupportedMimeType((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType) {
      failUnsupported();
      return;
    }

    const resolution = findResolution(resolutionId);
    const audio = getAudioEngine();
    const restoreSize = applyExportSize(
      canvas,
      resolution.width,
      resolution.height,
      window.devicePixelRatio,
    );

    let videoStream: MediaStream;
    let recorder: MediaRecorder;
    try {
      videoStream = canvas.captureStream(60);
      const audioStream = audio.getMediaStream();
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      recorder = new MediaRecorder(combined, { mimeType });
    } catch (error: unknown) {
      restoreSize();
      console.error("[export] falha ao iniciar a gravação:", error);
      toast.error(
        "Não foi possível iniciar a gravação",
        getErrorMessage(error, UNSUPPORTED_MESSAGE),
      );
      useAppStore.getState().setExportStatus("error");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current = [...chunksRef.current, event.data];
      }
    };
    recorder.onerror = (event: Event) => {
      console.error("[export] erro do MediaRecorder:", event);
      // o finalize de finishRecording fixa exportStatus "error" uma única vez
      finishRecording("error");
      toast.error("Erro durante a gravação", "A exportação foi interrompida.");
    };

    // só as tracks de vídeo são nossas; as de áudio pertencem ao engine
    const stopTracks = (): void => {
      videoStream.getTracks().forEach((track) => track.stop());
    };
    const offEnded = audio.onEnded(() => finishRecording("done"));
    recordingRef.current = {
      recorder,
      mimeType,
      stopTracks,
      restoreSize,
      offEnded,
    };

    recorder.start(1000);
    audio.seek(0);
    audio.play();
    useAppStore.getState().setExportProgress(0);
    useAppStore.getState().setExportStatus("recording");
  }

  function cancelExport(): void {
    finishRecording("cancel");
    toast.info("Exportação cancelada");
  }

  function handleClose(): void {
    if (recording) {
      cancelExport();
    }
    if (!processing) {
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Exportar vídeo"
      footer={
        busy ? (
          <Button onClick={cancelExport} disabled={processing}>
            Cancelar gravação
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Fechar</Button>
            <Button variant="solid" onClick={startExport} disabled={duration <= 0}>
              Iniciar exportação
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="export-progress">
          <p>
            {processing
              ? "Processando o vídeo…"
              : "Gravando… a música está sendo reproduzida em tempo real."}
          </p>
          <Progress
            value={processing ? 1 : exportProgress}
            tone="primary"
            showLabel
            label="Progresso da exportação"
          />
        </div>
      ) : (
        <div className="export-form">
          <Field label="Resolução" htmlFor="export-resolution">
            <Select
              id="export-resolution"
              value={resolutionId}
              onChange={(event) => setResolutionId(event.target.value)}
            >
              {EXPORT_RESOLUTIONS.map((resolution) => (
                <option key={resolution.id} value={resolution.id}>
                  {resolution.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="hint">
            A música toca do início ao fim durante a gravação e o vídeo (.webm)
            é baixado automaticamente ao final.
          </p>
          {exportStatus === "done" ? (
            <p className="export-status export-status--done">
              Última exportação concluída com sucesso.
            </p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
