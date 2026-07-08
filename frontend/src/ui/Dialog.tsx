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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Focus trap do padrão ARIA dialog: Tab/Shift+Tab ciclam apenas entre os
 * elementos focáveis internos ao card (o fundo fica inacessível por teclado).
 */
function trapTabKey(event: globalThis.KeyboardEvent, dialog: HTMLElement): void {
  const focusables = Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  if (focusables.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  const inside = dialog.contains(active);
  if (event.shiftKey) {
    if (!inside || active === first || active === dialog) {
      event.preventDefault();
      last.focus();
    }
    return;
  }
  if (!inside || active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Dialog Eyris — overlay, card min(440px, 92vw), fecha por Escape,
 * clique fora e botão ×. Foco inicial no dialog (a menos que um filho com
 * autoFocus já o tenha) e focus trap enquanto aberto.
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
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Deps apenas [open]: re-executar por onClose inline dos consumidores
  // refocaria elementos atrás do modal a cada re-render do pai.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // não roubar o foco de um filho com autoFocus (ex.: Input de nome)
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        trapTabKey(event, dialogRef.current);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [open]);

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
