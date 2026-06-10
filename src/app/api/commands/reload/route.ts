import { NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = botBridge.reloadCommands();
  return NextResponse.json(result);
}
