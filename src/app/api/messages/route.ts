import { NextRequest, NextResponse } from "next/server";
import { botBridge, startSimulators } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  startSimulators();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
  return NextResponse.json({ success: true, data: botBridge.getMessages(limit) });
}
