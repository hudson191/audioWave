/**
 * Área central do editor: UM RenderEngine ligado ao AudioEngine compartilhado.
 *
 * - StrictMode-safe: o RenderEngine é criado no effect e descartado no cleanup.
 * - Sincroniza store → engine (cena, settings, paleta).
 * - Aplica a timeline: com blocos, a cena corrente vem de sceneIdAt().
 * - Atualiza currentTime no store com throttle (~4x/s) e publica beat/bpm
 *   via frameEvents (sem re-render por frame).
 */
import { useEffect, useRef } from "react";
import { RenderEngine, getPalette } from "../../render";
import { sceneIdAt, useAppStore } from "../../state";
import { useEngines } from "../engine/EngineContext";
import { dispatchFrameSignal } from "./frameEvents";

const STORE_SYNC_INTERVAL_MS = 250;

export function VisualizerCanvas() {
  const { canvasRef, getAudioEngine } = useEngines();
  const renderRef = useRef<RenderEngine | null>(null);
  const appliedSceneRef = useRef<string | null>(null);
  const lastSyncRef = useRef(0);

  const sceneId = useAppStore((s) => s.sceneId);
  const settings = useAppStore((s) => s.settings);
  const timeline = useAppStore((s) => s.timeline);
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);
  const centerImageUrl = useAppStore((s) => s.centerImageUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let engine: RenderEngine;
    try {
      engine = new RenderEngine(canvas, {
        palette: getPalette(useAppStore.getState().settings.paletteId),
      });
    } catch (error: unknown) {
      console.error("[visualizer] falha ao iniciar o render:", error);
      return;
    }
    renderRef.current = engine;
    appliedSceneRef.current = null;
    lastSyncRef.current = 0;
    engine.setSettings(useAppStore.getState().settings);
    applySceneAt(useAppStore.getState().currentTime);

    const audio = getAudioEngine();
    engine.start(() => {
      const frame = audio.getFrame();
      applySceneAt(frame.time);
      publishFrame(frame.time, frame.beat, frame.bpm);
      return frame;
    });

    return () => {
      engine.dispose();
      if (renderRef.current === engine) {
        renderRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- funções estáveis via refs
  }, [canvasRef, getAudioEngine]);

  // store → engine: settings e paleta
  useEffect(() => {
    const engine = renderRef.current;
    if (!engine) {
      return;
    }
    engine.setSettings(settings);
    engine.setPalette(getPalette(settings.paletteId));
  }, [settings]);

  // store → engine: imagem de fundo (object URL de sessão)
  useEffect(() => {
    return syncEngineImage(backgroundImageUrl, (image) =>
      renderRef.current?.setBackgroundImage(image),
    );
  }, [backgroundImageUrl]);

  // store → engine: imagem central (cenas que suportam, ex.: osciloscópio)
  useEffect(() => {
    return syncEngineImage(centerImageUrl, (image) =>
      renderRef.current?.setCenterImage(image),
    );
  }, [centerImageUrl]);

  // store → engine: cena base / timeline (reavalia imediatamente)
  useEffect(() => {
    const engine = renderRef.current;
    if (!engine) {
      return;
    }
    const active = sceneIdAt(
      timeline,
      useAppStore.getState().currentTime,
      sceneId,
    );
    if (active !== appliedSceneRef.current) {
      engine.setScene(active);
      appliedSceneRef.current = active;
    }
  }, [sceneId, timeline]);

  /** Cena efetiva no instante `time` (timeline > cena base). */
  function applySceneAt(time: number): void {
    const engine = renderRef.current;
    if (!engine) {
      return;
    }
    const state = useAppStore.getState();
    const active = sceneIdAt(state.timeline, time, state.sceneId);
    if (active !== appliedSceneRef.current) {
      engine.setScene(active);
      appliedSceneRef.current = active;
    }
  }

  /** Throttle de currentTime no store + sinais de beat/bpm p/ o player. */
  function publishFrame(time: number, beat: boolean, bpm: number | null): void {
    if (beat) {
      dispatchFrameSignal(window, { beat: true, bpm });
    }
    const now = performance.now();
    if (now - lastSyncRef.current < STORE_SYNC_INTERVAL_MS) {
      return;
    }
    lastSyncRef.current = now;
    useAppStore.getState().setCurrentTime(time);
    if (!beat) {
      dispatchFrameSignal(window, { beat: false, bpm });
    }
  }

  return (
    <div className="visualizer">
      <canvas
        ref={canvasRef}
        className="visualizer__canvas"
        role="img"
        aria-label="Visualização reativa da música"
      />
    </div>
  );
}

/**
 * Carrega a imagem do URL e a entrega ao engine via `apply`; URL null limpa.
 * Retorna cleanup que cancela um load pendente (evita aplicar imagem obsoleta).
 */
function syncEngineImage(
  url: string | null,
  apply: (image: HTMLImageElement | null) => void,
): () => void {
  if (!url) {
    apply(null);
    return () => {};
  }
  let cancelled = false;
  const image = new Image();
  image.onload = () => {
    if (!cancelled) {
      apply(image);
    }
  };
  image.onerror = () => {
    if (!cancelled) {
      console.error("[visualizer] falha ao carregar imagem:", url);
      apply(null);
    }
  };
  image.src = url;
  return () => {
    cancelled = true;
  };
}
