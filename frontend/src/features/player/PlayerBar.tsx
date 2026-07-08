/**
 * Barra de player: play/pause, tempo corrente/duração (tabular-nums),
 * seek, volume, BPM detectado com pulso no beat e botão de exportação.
 */
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Slider, cx } from "../../ui";
import { useAppStore } from "../../state";
import { useEngines } from "../engine/EngineContext";
import { subscribeFrameSignal } from "../visualizer/frameEvents";
import { SeekBar } from "./SeekBar";
import { formatTime } from "./formatTime";
import "./player.css";

const PULSE_DURATION_MS = 140;

export interface PlayerBarProps {
  onOpenExport: () => void;
}

export function PlayerBar({ onOpenExport }: PlayerBarProps) {
  const { getAudioEngine } = useEngines();
  const status = useAppStore((s) => s.status);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const volume = useAppStore((s) => s.volume);
  const setVolume = useAppStore((s) => s.setVolume);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const exportStatus = useAppStore((s) => s.exportStatus);

  const [bpm, setBpm] = useState<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeFrameSignal(window, (signal) => {
      setBpm(signal.bpm);
      if (!signal.beat) {
        return;
      }
      setPulsing(true);
      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }
      pulseTimer.current = setTimeout(
        () => setPulsing(false),
        PULSE_DURATION_MS,
      );
    });
    return () => {
      unsubscribe();
      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }
    };
  }, []);

  const playing = status === "playing";
  const exporting = exportStatus === "recording" || exportStatus === "processing";
  const canPlay = duration > 0 && status !== "loading" && !exporting;

  function togglePlay(): void {
    const engine = getAudioEngine();
    if (playing) {
      engine.pause();
    } else {
      engine.play();
    }
  }

  function handleSeek(seconds: number): void {
    getAudioEngine().seek(seconds);
    setCurrentTime(seconds);
  }

  return (
    <footer className="player" aria-label="Controles de reprodução">
      <Button
        variant="solid"
        onClick={togglePlay}
        disabled={!canPlay}
        aria-label={playing ? "Pausar" : "Reproduzir"}
        className="player__toggle"
      >
        {playing ? "❚❚" : "▶"}
      </Button>

      <span className="player__time">{formatTime(currentTime)}</span>
      <SeekBar
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        disabled={exporting || duration <= 0}
      />
      <span className="player__time player__time--muted">
        {formatTime(duration)}
      </span>

      <div className="player__bpm" aria-label="Batidas por minuto detectadas">
        <span
          className={cx("player__beat", pulsing && "player__beat--on")}
          aria-hidden="true"
        />
        <Badge tone={bpm !== null ? "primary" : "neutral"}>
          {bpm !== null ? `${Math.round(bpm)} BPM` : "— BPM"}
        </Badge>
      </div>

      <div className="player__volume">
        <span className="player__volume-icon" aria-hidden="true">
          🔊
        </span>
        <Slider
          value={volume}
          onChange={setVolume}
          min={0}
          max={1}
          step={0.01}
          label="Volume"
          showValue
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      <Button onClick={onOpenExport} disabled={duration <= 0 || exporting}>
        Exportar vídeo
      </Button>
    </footer>
  );
}
