import { createSSEResponse } from "@/lib/sse-utils";
import { BotApiError } from "@/lib/bot-api-client";

export const METRICS_POLL_MS = 2000;
export const MESSAGES_POLL_MS = 2500;
export const LOGS_POLL_MS = 3000;

export function createPollingSSEResponse(
  request: Request,
  pollMs: number,
  poll: (send: (data: unknown) => void) => Promise<void>
): Response {
  return createSSEResponse(request, (send) => {
    let active = true;
    let polling = false;

    const runPoll = async () => {
      if (!active || polling) return;
      polling = true;
      try {
        await poll(send);
      } catch (error) {
        const message =
          error instanceof BotApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Poll failed";
        send({ error: message, type: "error" });
      } finally {
        polling = false;
      }
    };

    void runPoll();
    const interval = setInterval(() => void runPoll(), pollMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  });
}
