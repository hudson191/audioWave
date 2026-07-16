/**
 * Helpers de cor hex com canal alfa (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).
 *
 * Uma cor da paleta é transparente quando seu alfa é zero (ex.: #286CF000):
 * o matiz continua guardado, então ligar/desligar a transparência na UI é
 * reversível. Módulo sem dependências — math.ts e settings.ts importam daqui.
 */

/** Cor hex válida para persistência/validação (o "#" é obrigatório). */
export const HEX_COLOR_RE =
  /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Sufixo de alfa zero anexado ao hex opaco. */
const ALPHA_ZERO = "00";

/** Cor totalmente transparente (fallback quando não há matiz utilizável). */
export const TRANSPARENT_COLOR = "#000000" + ALPHA_ZERO;

/** Cor usada quando o hex de entrada é inválido. */
const FALLBACK_HEX = "#FFFFFF";

/** Canais de cor: r/g/b em 0-255 e alfa em 0-1. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Igual a HEX_COLOR_RE, mas com "#" opcional (hexToRgba aceita ambos). */
const LOOSE_HEX_RE = /^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Expande a forma curta (#RGB/#RGBA) duplicando cada dígito. */
function expandShorthand(body: string): string {
  return body
    .split("")
    .map((digit) => digit + digit)
    .join("");
}

/** Normaliza o corpo do hex (sem "#") para 6 ou 8 dígitos. Inválido → null. */
function normalizeBody(hex: string): string | null {
  const match = LOOSE_HEX_RE.exec(hex.trim());
  if (!match) return null;
  const body = match[1]!;
  return body.length <= 4 ? expandShorthand(body) : body;
}

/** Converte hex (com ou sem "#") em canais. Hex inválido → null. */
export function parseHex(hex: string): Rgba | null {
  const body = normalizeBody(hex);
  if (!body) return null;
  const rgb = Number.parseInt(body.slice(0, 6), 16);
  return {
    r: (rgb >> 16) & 0xff,
    g: (rgb >> 8) & 0xff,
    b: rgb & 0xff,
    a: body.length === 8 ? Number.parseInt(body.slice(6, 8), 16) / 255 : 1,
  };
}

/** Uma cor é transparente quando seu alfa é exatamente zero. */
export function isTransparent(hex: string): boolean {
  return parseHex(hex)?.a === 0;
}

/**
 * Descarta o canal alfa, preservando o matiz e a caixa original.
 * É o valor que `<input type="color">` aceita (#RRGGBB). Inválido → branco.
 */
export function toOpaqueHex(hex: string): string {
  const body = normalizeBody(hex);
  if (!body) return FALLBACK_HEX;
  return `#${body.slice(0, 6)}`;
}

/** Liga/desliga a transparência de uma cor, mantendo seu matiz. */
export function withTransparency(hex: string, transparent: boolean): string {
  const opaque = toOpaqueHex(hex);
  return transparent ? `${opaque}${ALPHA_ZERO}` : opaque;
}
