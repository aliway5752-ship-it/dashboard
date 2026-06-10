import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { restartBotProcess } from "@/lib/pm2";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    botBridge.createLog("warn", "Restarting bot process via PM2...", "system");
    const { output } = await restartBotProcess();
    botBridge.createLog("info", `PM2 restart: ${output}`, "pm2");
    return NextResponse.json({ success: true, data: { output } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restart failed";
    botBridge.createLog("error", message, "pm2");
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
