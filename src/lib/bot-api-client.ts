import type {
  ApiResponse,
  BotDataScope,
  RemoteBotCommandPayload,
  RemoteBotDataPayload,
} from "@/types/bot";

export class BotApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "BotApiError";
  }
}

export function isBotApiConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_BOT_API_URL && process.env.BOT_API_KEY
  );
}

export function getBotApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_BOT_API_URL;
  if (!url) {
    throw new BotApiError("NEXT_PUBLIC_BOT_API_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

function getBotApiKey(): string {
  const key = process.env.BOT_API_KEY;
  if (!key) {
    throw new BotApiError("BOT_API_KEY is not configured");
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
      response.status
    );
  }
}

export async function botApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBotApiUrl()}${path}`;

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getBotApiKey(),
      ...options.headers,
    },
  });

  const body = await parseJson<T>(response);

  if (!response.ok) {
    const errorBody = body as ApiResponse;
    throw new BotApiError(
      errorBody.error ?? `Bot API request failed (${response.status})`,
      response.status
    );
  }

  return body;
}

export async function fetchBotData(
  scope: BotDataScope,
  params?: Record<string, string>
): Promise<ApiResponse<RemoteBotDataPayload>> {
  const query = new URLSearchParams({ scope, ...params });
  return botApiRequest<ApiResponse<RemoteBotDataPayload>>(
    `/api/bot-data?${query.toString()}`
  );
}

export async function sendBotCommand<T = unknown>(
  payload: RemoteBotCommandPayload
): Promise<ApiResponse<T>> {
  return botApiRequest<ApiResponse<T>>("/api/bot-command", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
