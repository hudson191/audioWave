/** Helpers do envelope padrão { success, data, error } de todas as respostas. */
import type { ApiResponse } from "./types.js";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, data: null, error };
}
