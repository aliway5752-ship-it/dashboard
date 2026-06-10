import { botBridge } from "@/lib/bot-bridge";
import {
  createPollingSSEResponse,
  MESSAGES_POLL_MS,
} from "@/lib/poll-stream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seenIds = new Set<string>();
  let seeded = false;

  return createPollingSSEResponse(request, MESSAGES_POLL_MS, async (send) => {
    const messages = await botBridge.getMessages(100);

    for (const message of messages) {
      if (seenIds.has(message.id)) continue;
      seenIds.add(message.id);
      if (seeded) send(message);
    }
    seeded = true;

    if (seenIds.size > 1000) {
      const keep = new Set(messages.map((m) => m.id));
      for (const id of seenIds) {
        if (!keep.has(id)) seenIds.delete(id);
      }
    }
  });
}
