import { NextResponse, NextRequest } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import {
  createPollingSSEResponse,
  MESSAGES_POLL_MS,
  METRICS_POLL_MS,
  LOGS_POLL_MS,
} from "@/lib/poll-stream";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathParts = path || [];
  const fullPath = pathParts.join("/");

  // Handle SSE Streams
  if (fullPath === "stream/messages") {
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

  if (fullPath === "stream/metrics") {
    return createPollingSSEResponse(request, METRICS_POLL_MS, async (send) => {
      const metrics = await botBridge.getSystemMetrics();
      send(metrics);
    });
  }

  if (fullPath === "stream/logs") {
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

  // Handle Normal GET Requests
  try {
    if (fullPath === "status") {
      const data = await botBridge.getConnectionState();
      return NextResponse.json({ success: true, data });
    }

    if (fullPath === "stats") {
      const data = await botBridge.getDashboardStats();
      return NextResponse.json({ success: true, data });
    }

    if (fullPath === "messages") {
      const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
      const data = await botBridge.getMessages(limit);
      return NextResponse.json({ success: true, data });
    }

    if (fullPath === "commands") {
      const data = await botBridge.getCommands();
      return NextResponse.json({ success: true, data });
    }

    if (fullPath === "groups") {
      const data = await botBridge.getGroups();
      return NextResponse.json({ success: true, data });
    }

    if (fullPath === "logs") {
      const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
      const data = await botBridge.getLogs(limit);
      return NextResponse.json({ success: true, data });
    }

    // Default: Not found
    return NextResponse.json(
      { success: false, error: `Not Found: GET /api/${fullPath}` },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error(`[API Route GET Exception] GET /api/${fullPath} failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  const pathParts = path || [];
  const fullPath = pathParts.join("/");

  try {
    if (fullPath === "commands/reload") {
      const result = await botBridge.reloadCommands();
      return NextResponse.json(result);
    }

    if (fullPath === "system/clear-cache") {
      const result = await botBridge.clearCache();
      return NextResponse.json(result);
    }

    if (fullPath === "system/restart") {
      const result = await botBridge.restartBot();
      if (!result.success) {
        return NextResponse.json(result, { status: 500 });
      }
      return NextResponse.json(result);
    }

    if (pathParts[0] === "commands" && pathParts.length === 2) {
      const commandId = pathParts[1];
      const { enabled } = await request.json();
      const result = await botBridge.toggleCommand(commandId, enabled);
      return NextResponse.json(result);
    }

    if (pathParts[0] === "groups" && pathParts.length === 3) {
      const groupId = pathParts[1];
      const action = pathParts[2];

      if (action === "message") {
        const { message } = await request.json();
        const result = await botBridge.sendGroupMessage(groupId, message);
        return NextResponse.json(result);
      }

      if (action === "kick") {
        const { userId } = await request.json();
        const result = await botBridge.kickMember(groupId, userId);
        return NextResponse.json(result);
      }

      if (action === "promote") {
        const { userId } = await request.json();
        const result = await botBridge.promoteMember(groupId, userId);
        return NextResponse.json(result);
      }

      if (action === "purge") {
        const { confirm } = await request.json();
        const result = await botBridge.purgeGroup(groupId, confirm);
        return NextResponse.json(result);
      }
    }

    return NextResponse.json(
      { success: false, error: `Not Found: POST /api/${fullPath}` },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error(`[API Route POST Exception] POST /api/${fullPath} failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
