import { botBridge } from "@/lib/bot-bridge";
import {
  createPollingSSEResponse,
  LOGS_POLL_MS,
} from "@/lib/poll-stream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seenIds = new Set<string>();
  let seeded = false;

  return createPollingSSEResponse(request, LOGS_POLL_MS, async (send) => {
    const logs = await botBridge.getLogs(100);

    for (const log of logs) {
      if (seenIds.has(log.id)) continue;
      seenIds.add(log.id);
      if (seeded) send(log);
    }
    seeded = true;

    if (seenIds.size > 500) {
      const keep = new Set(logs.map((l) => l.id));
      for (const id of seenIds) {
        if (!keep.has(id)) seenIds.delete(id);
      }
    }
  });
}
