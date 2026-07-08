import type { ReactNode } from "react";
import { cx } from "./utils";
import "./ui-base.css";

export interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

/** Título de grupo/painel — 12px/600 uppercase letter-spacing .06em. */
export function SectionTitle({ children, className }: SectionTitleProps) {
  return <h3 className={cx("ui-section-title", className)}>{children}</h3>;
}
