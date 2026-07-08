/**
 * Helpers puros do UI kit Eyris (testáveis sem DOM).
 */

/** Junta classes ignorando valores falsy. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Restringe `value` ao intervalo [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Percentual (0–100) da posição de `value` entre `min` e `max`.
 * Retorna 0 para entradas inválidas (não numéricas ou max <= min).
 */
export function pctFromValue(value: number, min: number, max: number): number {
  const inputsValid =
    Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max);
  if (!inputsValid || max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

/** Formata fração 0–1 como percentual inteiro ("42%"). */
export function formatPercent(fraction: number): string {
  return `${Math.round(clamp(fraction, 0, 1) * 100)}%`;
}

export type Theme = "light" | "dark";

/** Narrowing seguro de valor externo (localStorage) para Theme. */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Resolve o tema inicial: valor persistido válido > preferência do sistema.
 */
export function resolveInitialTheme(
  stored: unknown,
  prefersDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}

export interface AcceptFilterResult {
  accepted: File[];
  rejected: File[];
}

function matchesAcceptToken(file: File, token: string): boolean {
  const normalized = token.trim().toLowerCase();
  if (normalized === "") return false;
  if (normalized.startsWith(".")) {
    return file.name.toLowerCase().endsWith(normalized);
  }
  const mime = file.type.toLowerCase();
  if (normalized.endsWith("/*")) {
    return mime.startsWith(normalized.slice(0, -1));
  }
  return mime === normalized;
}

/**
 * Separa arquivos aceitos/rejeitados segundo o atributo `accept`
 * (extensões ".mp3", MIME exato "audio/mpeg" ou curinga "audio/*").
 * Sem `accept`, todos são aceitos.
 */
export function filterFilesByAccept(
  files: readonly File[],
  accept?: string,
): AcceptFilterResult {
  if (!accept || accept.trim() === "") {
    return { accepted: [...files], rejected: [] };
  }
  const tokens = accept.split(",");
  return files.reduce<AcceptFilterResult>(
    (acc, file) => {
      const ok = tokens.some((token) => matchesAcceptToken(file, token));
      return ok
        ? { ...acc, accepted: [...acc.accepted, file] }
        : { ...acc, rejected: [...acc.rejected, file] };
    },
    { accepted: [], rejected: [] },
  );
}
