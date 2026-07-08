import type { ReactNode } from "react";
import { cx } from "./utils";
import "./ui-forms.css";

export interface FieldProps {
  /** Rótulo exibido acima do controle (13px/500). */
  label: string;
  /** id do controle associado ao label. */
  htmlFor?: string;
  /** Mensagem de erro amigável (exibida em vermelho). */
  error?: string;
  children: ReactNode;
  className?: string;
}

/** Envelopa um controle com label (gap 6px) e mensagem de erro opcional. */
export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cx("ui-field", className)}>
      <label className="ui-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="ui-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
