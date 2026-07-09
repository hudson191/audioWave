/**
 * Seletor de imagem (fundo do vídeo / centro do osciloscópio).
 * Valida tipo/tamanho, gera object URL de sessão e revoga o anterior.
 */
import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Button, useToast } from "../../ui";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface ImagePickerProps {
  id: string;
  /** Rótulo acessível do que a imagem representa (ex.: "Imagem de fundo"). */
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
}

/** Valida o arquivo de imagem; retorna mensagem de erro ou null. */
export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato não suportado. Use PNG, JPG, WebP ou GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "A imagem deve ter no máximo 10MB.";
  }
  return null;
}

export function ImagePicker({ id, label, url, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function handleFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) {
      return;
    }
    const error = validateImageFile(file);
    if (error) {
      toast.error("Imagem inválida", error);
      return;
    }
    if (url) {
      URL.revokeObjectURL(url);
    }
    onChange(URL.createObjectURL(file));
  }

  function handleClear(): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
    onChange(null);
  }

  return (
    <div className="image-picker">
      {url ? (
        <img
          className="image-picker__thumb"
          src={url}
          alt={`Pré-visualização: ${label}`}
        />
      ) : (
        <span className="image-picker__placeholder" aria-hidden="true">
          🖼️
        </span>
      )}
      <div className="image-picker__actions">
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          aria-label={url ? `Trocar ${label}` : `Escolher ${label}`}
        >
          {url ? "Trocar" : "Escolher"}
        </Button>
        {url ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            aria-label={`Remover ${label}`}
          >
            Remover
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFile}
        className="image-picker__input"
        aria-label={label}
        tabIndex={-1}
      />
    </div>
  );
}
