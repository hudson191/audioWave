/**
 * Diálogo de exportação com dois caminhos:
 *
 * 1. RÁPIDO (padrão, quando o navegador tem WebCodecs): render offline
 *    quadro a quadro + VideoEncoder/AudioEncoder → MP4 (H.264/AAC). Roda bem
 *    acima de 1× (não toca o áudio), com progresso por quadros encodados.
 * 2. FALLBACK (sem WebCodecs): canvas.captureStream(60) + MediaRecorder → WebM,
 *    em tempo real (1×), tocando o áudio do início ao fim.
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
  isFastExportSupported,
  loadImage,
  pickSupportedMimeType,
  waitForCanvasSize,
} from "./exportUtils";
import { ExportCancelledError, exportWithWebCodecs } from "./webcodecsExport";
import "./export.css";

const UNSUPPORTED_MESSAGE =
  "Seu navegador não suporta gravação de vídeo. Use uma versão recente do Chrome, Edge ou Firefox.";
/** FPS do export rápido (offline). 30 é suave o bastante e mais leve. */
const FAST_EXPORT_FPS = 30;

type ExportMode = "fast" | "fallback";

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
  const [mode, setMode] = useState<ExportMode | null>(null);
  const recordingRef = useRef<ActiveRecording | null>(null);
  const chunksRef = useRef<readonly Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fastSupported = isFastExportSupported();
  const recording = exportStatus === "recording";
  const processing = exportStatus === "processing";
  const busy = recording || processing;

  // Progresso do FALLBACK vem do currentTime (áudio tocando em tempo real).
  // No modo rápido o progresso é setado direto pelo onProgress do encoder.
  useEffect(() => {
    if (recording && mode === "fallback") {
      useAppStore
        .getState()
        .setExportProgress(computeExportProgress(currentTime, duration));
    }
  }, [recording, mode, currentTime, duration]);

  // ao reabrir o diálogo, limpa estado de exportações anteriores
  useEffect(() => {
    if (open && !recordingRef.current && !abortRef.current) {
      const store = useAppStore.getState();
      if (store.exportStatus === "done" || store.exportStatus === "error") {
        store.setExportStatus("idle");
        store.setExportProgress(0);
      }
    }
  }, [open]);

  // ============================ MODO RÁPIDO (WebCodecs) ====================

  const runFastExport = useCallback(
    async (width: number, height: number): Promise<void> => {
      const audio = getAudioEngine();
      const buffer = audio.getAudioBuffer();
      if (!buffer) {
        toast.error(
          "Exportação indisponível",
          "Carregue um áudio antes de exportar o vídeo.",
        );
        return;
      }
      const store = useAppStore.getState();
      const controller = new AbortController();
      abortRef.current = controller;
      setMode("fast");
      store.setExportStatus("recording");
      store.setExportProgress(0);

      try {
        const [backgroundImage, centerImage] = await Promise.all([
          loadImage(store.backgroundImageUrl),
          loadImage(store.centerImageUrl),
        ]);
        const blob = await exportWithWebCodecs({
          audioBuffer: buffer,
          width,
          height,
          fps: FAST_EXPORT_FPS,
          sceneId: store.sceneId,
          settings: store.settings,
          timeline: store.timeline,
          backgroundImage,
          centerImage,
          onProgress: (fraction) =>
            useAppStore.getState().setExportProgress(fraction),
          signal: controller.signal,
        });
        downloadBlob(
          blob,
          buildExportFileName(useAppStore.getState().audioFileName, "mp4"),
        );
        useAppStore.getState().setExportProgress(1);
        useAppStore.getState().setExportStatus("done");
        toast.success(
          "Exportação concluída",
          "O download do vídeo (MP4) foi iniciado.",
        );
      } catch (error: unknown) {
        if (error instanceof ExportCancelledError) {
          useAppStore.getState().setExportStatus("idle");
          useAppStore.getState().setExportProgress(0);
          toast.info("Exportação cancelada");
        } else {
          console.error("[export] falha no modo rápido:", error);
          useAppStore.getState().setExportStatus("error");
          toast.error(
            "Falha na exportação",
            getErrorMessage(error, "Não foi possível gerar o vídeo."),
          );
        }
      } finally {
        abortRef.current = null;
        setMode(null);
      }
    },
    [getAudioEngine, toast],
  );

  // ============================ FALLBACK (MediaRecorder) ==================

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
            buildExportFileName(useAppStore.getState().audioFileName, "webm"),
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
        setMode(null);
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

  // cancelamento seguro se o componente desmontar durante uma exportação
  useEffect(() => {
    return () => {
      finishRecording("cancel");
      abortRef.current?.abort();
    };
  }, [finishRecording]);

  function failUnsupported(): void {
    toast.error("Exportação indisponível", UNSUPPORTED_MESSAGE);
    useAppStore.getState().setExportStatus("error");
  }

  async function startFallbackExport(
    width: number,
    height: number,
  ): Promise<void> {
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

    const audio = getAudioEngine();
    const restoreSize = applyExportSize(
      canvas,
      width,
      height,
      window.devicePixelRatio,
    );
    await waitForCanvasSize(canvas, width, height);

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
      finishRecording("error");
      toast.error("Erro durante a gravação", "A exportação foi interrompida.");
    };

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

    setMode("fallback");
    recorder.start(1000);
    audio.seek(0);
    audio.play();
    useAppStore.getState().setExportProgress(0);
    useAppStore.getState().setExportStatus("recording");
  }

  // ============================ orquestração comum ========================

  function startExport(): void {
    const resolution = findResolution(resolutionId);
    if (fastSupported) {
      void runFastExport(resolution.width, resolution.height);
    } else {
      void startFallbackExport(resolution.width, resolution.height);
    }
  }

  function cancelExport(): void {
    if (mode === "fast") {
      abortRef.current?.abort();
      return;
    }
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

  const progressText =
    mode === "fallback"
      ? "Gravando… a música está sendo reproduzida em tempo real."
      : processing
        ? "Processando o vídeo…"
        : "Gerando o vídeo… (modo rápido, sem tocar o áudio)";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Exportar vídeo"
      footer={
        busy ? (
          <Button onClick={cancelExport} disabled={processing}>
            Cancelar
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Fechar</Button>
            <Button
              variant="solid"
              onClick={startExport}
              disabled={duration <= 0}
            >
              Iniciar exportação
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="export-progress">
          <p>{progressText}</p>
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
            {fastSupported
              ? "Modo rápido: o vídeo (.mp4) é gerado bem mais rápido que a duração da música e baixado automaticamente ao final."
              : "A música toca do início ao fim durante a gravação e o vídeo (.webm) é baixado automaticamente ao final."}
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
