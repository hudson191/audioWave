/**
 * Formatação pura de tempo de playback (m:ss).
 */

/** Formata segundos como "m:ss" (ex.: 75 → "1:15"). Valores inválidos → "0:00". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
