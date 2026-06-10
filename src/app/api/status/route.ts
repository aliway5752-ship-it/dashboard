import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await botBridge.getConnectionState();
  return NextResponse.json({ success: true, data });
}
