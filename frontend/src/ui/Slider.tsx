import type { CSSProperties, ChangeEvent } from "react";
import { cx, pctFromValue } from "./utils";
import "./ui-forms.css";

export interface SliderMark {
  value: number;
  label: string;
}

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Rótulo acessível do controle. */
  label?: string;
  id?: string;
  /** Exibe o valor corrente à direita (13px, tabular-nums). */
  showValue?: boolean;
  formatValue?: (value: number) => string;
  /** Marcas exibidas abaixo do track (11px, space-between). */
  marks?: readonly SliderMark[];
  disabled?: boolean;
  className?: string;
}

/**
 * Slider Eyris — track 4px com preenchimento via --pct, thumb 16px
 * com borda primary.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  id,
  showValue = false,
  formatValue,
  marks,
  disabled,
  className,
}: SliderProps) {
  const pct = pctFromValue(value, min, max);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) onChange(next);
  }

  const style = { "--pct": `${pct}%` } as CSSProperties;

  return (
    <div className={cx("ui-slider", className)}>
      <div className="ui-slider__row">
        <input
          type="range"
          className="ui-slider__input"
          style={style}
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={label}
        />
        {showValue ? (
          <span className="ui-slider__value">
            {formatValue ? formatValue(value) : String(value)}
          </span>
        ) : null}
      </div>
      {marks && marks.length > 0 ? (
        <div className="ui-slider__marks" aria-hidden="true">
          {marks.map((mark) => (
            <span key={mark.value}>{mark.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
