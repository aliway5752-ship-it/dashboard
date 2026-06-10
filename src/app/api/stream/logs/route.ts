import { botBridge, startSimulators } from "@/lib/bot-bridge";
import { sseHub } from "@/lib/sse-hub";
import { createSSEResponse } from "@/lib/sse-utils";
import { readErrorLogTail, watchErrorLog } from "@/lib/pm2";
import type { SystemLog } from "@/types/bot";

export const dynamic = "force-dynamic";

function parsePm2Line(line: string): SystemLog {
  const match = line.match(
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.+)$/
  );

  if (match) {
    const [, dateTime, level, message] = match;
    const time = dateTime.split(" ")[1] ?? dateTime;
    return {
      id: `pm2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      level: (level as SystemLog["level"]) ?? "info",
      message,
      source: "pm2",
    };
  }

  return {
    id: `pm2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    level: "info",
    message: line,
    source: "pm2",
  };
}

export async function GET(request: Request) {
  startSimulators();

  const initialLines = await readErrorLogTail(30);

  return createSSEResponse(request, (send) => {
    for (const line of initialLines) {
      send(parsePm2Line(line));
    }

    const unsubscribeSSE = sseHub.subscribe("logs", (data) => {
      send(data);
    });

    const stopWatch = watchErrorLog((line) => {
      send(parsePm2Line(line));
    });

    botBridge.createLog("info", "Log stream connected", "system");

    return () => {
      unsubscribeSSE();
      stopWatch();
    };
  });
}
