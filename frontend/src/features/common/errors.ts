/**
 * Helper puro para extrair mensagens amigáveis de erros desconhecidos.
 */

export const GENERIC_ERROR_MESSAGE =
  "Ocorreu um erro inesperado. Tente novamente.";

/** Extrai a mensagem de um erro desconhecido com fallback amigável. */
export function getErrorMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }
  return fallback;
}
