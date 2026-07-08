import { clamp, cx, formatPercent } from "./utils";
import "./ui-overlay.css";

export type ProgressTone = "primary" | "success" | "danger" | "warning" | "info";

export interface ProgressProps {
  /** Fração 0–1. */
  value: number;
  tone?: ProgressTone;
  /** Exibe o percentual à direita (13px, 36px de largura). */
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/** Barra de progresso Eyris — 6px, radius 999px, cor semântica. */
export function Progress({
  value,
  tone = "primary",
  showLabel = true,
  label = "Progresso",
  className,
}: ProgressProps) {
  const fraction = clamp(value, 0, 1);
  return (
    <div
      className={cx(
        "ui-progress",
        tone !== "primary" && `ui-progress--${tone}`,
        className,
      )}
    >
      <div
        className="ui-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
      >
        <div
          className="ui-progress__fill"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {showLabel ? (
        <span className="ui-progress__label">{formatPercent(fraction)}</span>
      ) : null}
    </div>
  );
}

const CIRCLE_RADIUS = 36;
const CIRCLE_STROKE = 7;
const CIRCLE_SIZE = 80;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export interface ProgressCircleProps {
  /** Fração 0–1. */
  value: number;
  tone?: ProgressTone;
  label?: string;
  className?: string;
}

/** Progresso circular Eyris — SVG r=36, stroke 7, label central 14px/600. */
export function ProgressCircle({
  value,
  tone = "primary",
  label = "Progresso",
  className,
}: ProgressCircleProps) {
  const fraction = clamp(value, 0, 1);
  const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
  const center = CIRCLE_SIZE / 2;
  return (
    <div
      className={cx(
        "ui-progress-circle",
        tone !== "primary" && `ui-progress-circle--${tone}`,
        className,
      )}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
    >
      <svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="ui-progress-circle__track"
          cx={center}
          cy={center}
          r={CIRCLE_RADIUS}
          fill="none"
          strokeWidth={CIRCLE_STROKE}
        />
        <circle
          className="ui-progress-circle__fill"
          cx={center}
          cy={center}
          r={CIRCLE_RADIUS}
          fill="none"
          strokeWidth={CIRCLE_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ui-progress-circle__label">
        {formatPercent(fraction)}
      </span>
    </div>
  );
}
