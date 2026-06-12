import { botApiRequest } from "./bot-api-client";
import type { ApiResponse } from "@/types/bot";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    // Basic validation to ensure we only proxy /api calls
    if (!path.startsWith("/api/")) {
      const response = await fetch(path, options);
      return (await response.json()) as ApiResponse<T>;
    }

    // Use botApiRequest which handles the CORS proxy and API key
    return await botApiRequest<ApiResponse<T>>(path, options);
  } catch (error: unknown) {
    console.error(`apiFetch error for ${path}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      error: errorMessage || `Request to ${path} failed` 
    } as ApiResponse<T>;
  }
}
