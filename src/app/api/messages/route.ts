import { NextRequest, NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { BotApiError } from "@/lib/bot-api-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
    const data = await botBridge.getMessages(limit);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof BotApiError ? error.message : "Failed to fetch messages";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
