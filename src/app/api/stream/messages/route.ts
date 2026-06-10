import { startSimulators } from "@/lib/bot-bridge";
import { sseHub } from "@/lib/sse-hub";
import { createSSEResponse } from "@/lib/sse-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  startSimulators();

  return createSSEResponse(request, (send) => {
    const unsubscribe = sseHub.subscribe("messages", (data) => {
      send(data);
    });

    return unsubscribe;
  });
}
