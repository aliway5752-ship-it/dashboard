import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { BotApiError } from "@/lib/bot-api-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await botBridge.getGroups();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof BotApiError ? error.message : "Failed to fetch groups";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
