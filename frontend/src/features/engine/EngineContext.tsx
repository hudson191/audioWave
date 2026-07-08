/**
 * Contexto que compartilha o AudioEngine único e o canvas do visualizador
 * entre as features (upload, player, visualizer, export).
 *
 * StrictMode-safe: o engine é criado sob demanda (lazy) e, após o dispose
 * do cleanup, uma nova instância é criada no próximo acesso.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { ReactNode, RefObject } from "react";
import { AudioEngine } from "../../audio";
import { useAppStore } from "../../state";

export interface EngineContextValue {
  /** AudioEngine único da aplicação (criado sob demanda). */
  getAudioEngine: () => AudioEngine;
  /** Ref do canvas do visualizador (preenchida pelo VisualizerCanvas). */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

const EngineContext = createContext<EngineContextValue | null>(null);

/** Acessa os engines compartilhados. Deve ser usado dentro de <EngineProvider>. */
export function useEngines(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error("useEngines deve ser usado dentro de <EngineProvider>.");
  }
  return ctx;
}

export function EngineProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<AudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getAudioEngine = useCallback((): AudioEngine => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const engine = getAudioEngine();
    const offStatus = engine.onStatusChange((status) => {
      useAppStore.getState().setStatus(status);
    });
    engine.setVolume(useAppStore.getState().volume);
    const offVolume = useAppStore.subscribe((state, prev) => {
      if (state.volume !== prev.volume) {
        engine.setVolume(state.volume);
      }
    });
    return () => {
      offStatus();
      offVolume();
      engine.dispose();
      if (audioRef.current === engine) {
        audioRef.current = null;
      }
    };
  }, [getAudioEngine]);

  const value = useMemo<EngineContextValue>(
    () => ({ getAudioEngine, canvasRef }),
    [getAudioEngine],
  );

  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
}
