import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { BotApiError } from "@/lib/bot-api-client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await botBridge.restartBot();
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof BotApiError ? error.message : "Restart failed";
    botBridge.createLog("error", message, "system");
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
