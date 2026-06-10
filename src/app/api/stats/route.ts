import { NextResponse } from "next/server";
import { botBridge, startSimulators } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  startSimulators();
  return NextResponse.json({ success: true, data: botBridge.getDashboardStats() });
}
