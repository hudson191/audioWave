import { describe, expect, it, vi } from "vitest";
import {
  FRAME_SIGNAL_EVENT,
  dispatchFrameSignal,
  readFrameSignal,
  subscribeFrameSignal,
} from "./frameEvents";

describe("frameEvents", () => {
  it("entrega o sinal publicado ao assinante", () => {
    const target = new EventTarget();
    const received: unknown[] = [];
    const unsubscribe = subscribeFrameSignal(target, (signal) => {
      received.push(signal);
    });

    dispatchFrameSignal(target, { beat: true, bpm: 120 });
    expect(received).toEqual([{ beat: true, bpm: 120 }]);

    unsubscribe();
    dispatchFrameSignal(target, { beat: false, bpm: null });
    expect(received).toHaveLength(1);
  });

  it("aceita bpm null", () => {
    const target = new EventTarget();
    const callback = vi.fn();
    subscribeFrameSignal(target, callback);
    dispatchFrameSignal(target, { beat: false, bpm: null });
    expect(callback).toHaveBeenCalledWith({ beat: false, bpm: null });
  });

  it("ignora eventos com payload inválido", () => {
    const target = new EventTarget();
    const callback = vi.fn();
    subscribeFrameSignal(target, callback);

    target.dispatchEvent(new CustomEvent(FRAME_SIGNAL_EVENT, { detail: {} }));
    target.dispatchEvent(
      new CustomEvent(FRAME_SIGNAL_EVENT, { detail: { beat: 1, bpm: "x" } }),
    );
    target.dispatchEvent(new Event(FRAME_SIGNAL_EVENT));

    expect(callback).not.toHaveBeenCalled();
  });

  it("readFrameSignal rejeita bpm não finito", () => {
    const event = new CustomEvent(FRAME_SIGNAL_EVENT, {
      detail: { beat: true, bpm: Number.NaN },
    });
    expect(readFrameSignal(event)).toBeNull();
  });

  it("readFrameSignal retorna cópia do detail válido", () => {
    const detail = { beat: true, bpm: 98 };
    const event = new CustomEvent(FRAME_SIGNAL_EVENT, { detail });
    const parsed = readFrameSignal(event);
    expect(parsed).toEqual(detail);
    expect(parsed).not.toBe(detail);
  });
});
