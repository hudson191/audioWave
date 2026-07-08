/**
 * Barra de progresso clicável/arrastável (seek) — role="slider" navegável
 * por teclado (setas ±5s, Home/End).
 */
import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cx } from "../../ui";
import { formatTime } from "./formatTime";

const KEYBOARD_STEP_SECONDS = 5;

export interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
}

function clampRatio(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function SeekBar({
  currentTime,
  duration,
  onSeek,
  disabled = false,
}: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const ratio = duration > 0 ? clampRatio(currentTime / duration) : 0;
  const interactive = !disabled && duration > 0;

  function seekFromClientX(clientX: number): void {
    const track = trackRef.current;
    if (!track || duration <= 0) {
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const nextRatio = clampRatio((clientX - rect.left) / rect.width);
    onSeek(nextRatio * duration);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (!interactive) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    seekFromClientX(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (dragging) {
      seekFromClientX(event.clientX);
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>): void {
    if (!dragging) {
      return;
    }
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!interactive) {
      return;
    }
    const seekTo = (seconds: number): void => {
      event.preventDefault();
      onSeek(Math.min(Math.max(seconds, 0), duration));
    };
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      seekTo(currentTime + KEYBOARD_STEP_SECONDS);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      seekTo(currentTime - KEYBOARD_STEP_SECONDS);
    } else if (event.key === "Home") {
      seekTo(0);
    } else if (event.key === "End") {
      seekTo(duration);
    }
  }

  return (
    <div
      ref={trackRef}
      className={cx("seekbar", !interactive && "seekbar--disabled")}
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-label="Posição da música"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
      aria-disabled={!interactive}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      <div className="seekbar__track">
        <div className="seekbar__fill" style={{ width: `${ratio * 100}%` }} />
        <div className="seekbar__thumb" style={{ left: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
