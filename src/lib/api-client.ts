import type { ApiResponse } from "@/types/bot";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok && !data.error) {
    return { success: false, error: `Request failed (${response.status})` };
  }
  return data;
}
