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
    throw new BotApiError("BOT_API_KEY is not configured on the server");
  }
  return key;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BotApiError(
      `Invalid JSON from bot API (${response.status})`,
      response.status,
    );
  }
}

export async function botApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getBotApiUrl()}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getBotApiKey(),
        "ngrok-skip-browser-warning": "true",
        ...options.headers,
      },
    });

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
    console.error(
      `[Server API Route Fetch Failure] Failed to request ${url}:`,
      error,
    );
    throw error;
  }
}

export async function fetchBotData(
  scope: BotDataScope,
  params?: Record<string, string>,
): Promise<ApiResponse<RemoteBotDataPayload>> {
  const query = new URLSearchParams({ scope, ...params });
  return botApiRequest<ApiResponse<RemoteBotDataPayload>>(
    `/api/bot-data?${query.toString()}`,
  );
}

export async function sendBotCommand<T = unknown>(
  payload: RemoteBotCommandPayload,
): Promise<ApiResponse<T>> {
  return botApiRequest<ApiResponse<T>>("/api/bot-command", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
