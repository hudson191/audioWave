import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cx } from "./utils";
import "./ui-overlay.css";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Botões do rodapé (alinhados à direita, gap 10px). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Dialog Eyris — overlay, card min(440px, 92vw), fecha por Escape,
 * clique fora e botão ×. Foco inicial no próprio dialog.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="ui-dialog-overlay" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        className={cx("ui-dialog", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ui-dialog__header">
          <h2 id={titleId} className="ui-dialog__title">
            {title}
          </h2>
          <button
            type="button"
            className="ui-dialog__close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="ui-dialog__body">{children}</div>
        {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
