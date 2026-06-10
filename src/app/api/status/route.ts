import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: botBridge.getConnectionState() });
}
