import type { ReactNode } from "react";
import { cx } from "./utils";
import "./ui-base.css";

export interface CardProps {
  /** Rótulo (14px, text-muted). */
  label?: string;
  /** Valor de destaque (20px/600). */
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Card Eyris — surface + border, radius 8px, padding 16px. */
export function Card({ label, value, children, className }: CardProps) {
  return (
    <div className={cx("ui-card", className)}>
      {label ? <div className="ui-card__label">{label}</div> : null}
      {value != null ? <div className="ui-card__value">{value}</div> : null}
      {children}
    </div>
  );
}
