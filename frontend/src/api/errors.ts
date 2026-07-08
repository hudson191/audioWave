/**
 * Erro de comunicação com a API do audioWave.
 * Sempre carrega uma mensagem amigável em pt-BR pronta para exibição na UI.
 */
export class ApiError extends Error {
  /** Status HTTP associado (null quando a falha foi de rede/parse). */
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Type guard para narrowing seguro de erros desconhecidos. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
