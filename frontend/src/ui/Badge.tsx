import type { ReactNode } from "react";
import { cx } from "./utils";
import "./ui-base.css";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** Badge Eyris — 12px/600, radius 6px, cor semântica + fundo tint. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span className={cx("ui-badge", `ui-badge--${tone}`, className)}>
      {children}
    </span>
  );
}
