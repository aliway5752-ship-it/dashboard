import type { ApiResponse } from "@/types/bot";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const text = await response.text();
    if (!text) {
      return { success: response.ok } as unknown as ApiResponse<T>;
    }

    try {
      const data = JSON.parse(text) as ApiResponse<T>;
      if (!response.ok && !data.error) {
        return { 
          success: false, 
          error: `Request failed (${response.status})` 
        } as unknown as ApiResponse<T>;
      }
      return data;
    } catch {
      return {
        success: false,
        error: `Invalid JSON response (${response.status})`
      } as unknown as ApiResponse<T>;
    }
  } catch (error: unknown) {
    console.error(`apiFetch error for ${path}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      error: errorMessage || `Request to ${path} failed` 
    } as unknown as ApiResponse<T>;
  }
}
