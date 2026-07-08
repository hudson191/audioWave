/**
 * Canal leve de sinais por frame (beat/bpm) entre o loop de render e a UI
 * (pulso do PlayerBar), sem passar pelo store — evita re-render por frame.
 */

export const FRAME_SIGNAL_EVENT = "audiowave:frame-signal";

export interface FrameSignal {
  beat: boolean;
  bpm: number | null;
}

function isFrameSignal(value: unknown): value is FrameSignal {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const bpmOk =
    record.bpm === null ||
    (typeof record.bpm === "number" && Number.isFinite(record.bpm));
  return typeof record.beat === "boolean" && bpmOk;
}

/** Extrai e valida o FrameSignal de um evento; payload inválido → null. */
export function readFrameSignal(event: Event): FrameSignal | null {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!isFrameSignal(detail)) {
    return null;
  }
  return { beat: detail.beat, bpm: detail.bpm };
}

/** Publica um sinal de frame no target (tipicamente `window`). */
export function dispatchFrameSignal(
  target: EventTarget,
  signal: FrameSignal,
): void {
  target.dispatchEvent(
    new CustomEvent<FrameSignal>(FRAME_SIGNAL_EVENT, {
      detail: { ...signal },
    }),
  );
}

/** Assina sinais de frame; retorna função de unsubscribe. */
export function subscribeFrameSignal(
  target: EventTarget,
  callback: (signal: FrameSignal) => void,
): () => void {
  const handler = (event: Event): void => {
    const signal = readFrameSignal(event);
    if (signal) {
      callback(signal);
    }
  };
  target.addEventListener(FRAME_SIGNAL_EVENT, handler);
  return () => {
    target.removeEventListener(FRAME_SIGNAL_EVENT, handler);
  };
}
