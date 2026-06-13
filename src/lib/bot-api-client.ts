import type {
  ApiResponse,
  BotDataScope,
  RemoteBotCommandPayload,
  RemoteBotDataPayload,
} from "@/types/bot";

export class BotApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BotApiError";
  }
}

export function isBotApiConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_BOT_API_URL || "http://85.208.9.224:9518";
  const key = process.env.BOT_API_KEY;
  return Boolean(url && key);
}

export function getBotApiUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_BOT_API_URL || "http://85.208.9.224:9518";
  return baseUrl.replace(/\/$/, "");
}

function getBotApiKey(): string {
  const key = process.env.BOT_API_KEY;
  if (!key) {
    console.error("🚨 [CRITICAL] BOT_API_KEY is completely missing from Vercel Environment Variables!");
    throw new BotApiError("BOT_API_KEY is not configured on the server");
  }
  return key;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  
  // Debug system to log raw Ngrok responses in Vercel
  console.log(`[DEBUG] Raw response from ${response.url} (Status: ${response.status}):`, text.substring(0, 300));
  
  if (!text) return {} as T;
  
  try {
    return JSON.parse(text) as T;
  } catch {
    if (!response.ok) {
      return { 
        error: `HTTP Error ${response.status}: Invalid format.` 
      } as T;
    }
    throw new BotApiError(`Invalid JSON from bot API (${response.status})`, response.status);
  }
}

export async function botApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getBotApiUrl()}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); 

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getBotApiKey(),
        "ngrok-skip-browser-warning": "69420",
        "User-Agent": "AstaBot-Dashboard-Vercel/1.0", 
        "Bypass-Tunnel-Reminder": "true",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    const body = await parseJson<T>(response);

    if (!response.ok) {
      const errorBody = body as ApiResponse;
      throw new BotApiError(
        errorBody.error ?? `Bot API request failed (${response.status})`,
        response.status,
      );
    }

    return body;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error(`🚨 [API Fetch Failure] URL: ${url} | Error:`, error instanceof Error ? error.message : "Unknown");
    throw error;
  }
}

export async function fetchBotData(
  scope: BotDataScope,
  params?: Record<string, string>,
): Promise<ApiResponse<RemoteBotDataPayload>> {
  try {
    const query = params ? new URLSearchParams(params).toString() : "";
    const queryString = query ? `?${query}` : "";
    
    console.log(`[DEBUG] Attempting to fetch scope: ${scope}`);
    
    const response = await botApiRequest<Record<string, unknown>>(
      `/api/${scope}${queryString}`,
    );

    const scopeData = response[scope] as RemoteBotDataPayload;

    return {
      success: response.success as boolean ?? true,
      data: scopeData || ({} as RemoteBotDataPayload),
    } as ApiResponse<RemoteBotDataPayload>;
    
  } catch (error: unknown) {
    console.warn(`⚠️ [Safe Fallback] Failed to fetch data for ${scope}. Error:`, error instanceof Error ? error.message : "Unknown");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bot data",
      data: {} as RemoteBotDataPayload,
    } as ApiResponse<RemoteBotDataPayload>;
  }
}

export async function sendBotCommand<T = unknown>(
  payload: RemoteBotCommandPayload,
): Promise<ApiResponse<T>> {
  try {
    return await botApiRequest<ApiResponse<T>>("/api/bot-command", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send bot command",
    } as ApiResponse<T>;
  }
}
