import { botBridge } from "@/lib/bot-bridge";
import {
  createPollingSSEResponse,
  METRICS_POLL_MS,
} from "@/lib/poll-stream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return createPollingSSEResponse(request, METRICS_POLL_MS, async (send) => {
    const metrics = await botBridge.getSystemMetrics();
    send(metrics);
  });
}
