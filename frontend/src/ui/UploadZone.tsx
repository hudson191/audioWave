import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { cx, filterFilesByAccept } from "./utils";
import "./ui-forms.css";

export interface UploadZoneProps {
  /** Recebe os arquivos aceitos (já filtrados por `accept`). */
  onFiles: (files: File[]) => void;
  /** Ex.: "audio/*,.mp3,.wav". */
  accept?: string;
  multiple?: boolean;
  /** Texto principal da zona. */
  title?: string;
  /** Texto auxiliar (formatos, tamanho máximo etc.). */
  hint?: string;
  /** Mensagem amigável quando arquivos são rejeitados pelo `accept`. */
  onError?: (message: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * UploadZone Eyris — borda dashed 1.5px, estados hover/drag com
 * primary-tint. Acessível: role=button + input[type=file] escondido,
 * ativável por Enter/Espaço.
 */
export function UploadZone({
  onFiles,
  accept,
  multiple = false,
  title = "Arraste um arquivo ou clique para selecionar",
  hint,
  onError,
  disabled = false,
  label = "Enviar arquivo",
  className,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function emitFiles(list: FileList | null): void {
    if (disabled || !list || list.length === 0) return;
    const { accepted, rejected } = filterFilesByAccept(
      Array.from(list),
      accept,
    );
    if (rejected.length > 0 && onError) {
      onError("Alguns arquivos têm um formato não aceito e foram ignorados.");
    }
    if (accepted.length === 0) return;
    onFiles(multiple ? accepted : accepted.slice(0, 1));
  }

  function openPicker(): void {
    if (!disabled) inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    emitFiles(event.dataTransfer?.files ?? null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    emitFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div
      className={cx(
        "ui-upload",
        dragging && "ui-upload--drag",
        disabled && "ui-upload--disabled",
        className,
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="ui-upload__title">{title}</span>
      {hint ? <span className="ui-upload__hint">{hint}</span> : null}
      <input
        ref={inputRef}
        className="ui-upload__input"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
