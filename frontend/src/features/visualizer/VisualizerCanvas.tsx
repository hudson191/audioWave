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
