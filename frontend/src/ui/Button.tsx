import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./utils";
import "./ui-base.css";

export type ButtonVariant = "solid" | "default" | "subtle" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone opcional exibido antes do conteúdo. */
  icon?: ReactNode;
}

/**
 * Botão Eyris — 36px (md), radius 8px, variantes solid/default/subtle/ghost.
 */
export function Button({
  variant = "default",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "ui-btn",
        `ui-btn--${variant}`,
        size !== "md" && `ui-btn--${size}`,
        className,
      )}
      {...rest}
    >
      {icon != null ? (
        <span className="ui-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
