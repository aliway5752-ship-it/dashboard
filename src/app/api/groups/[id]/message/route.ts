import { NextRequest, NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { BotApiError } from "@/lib/bot-api-client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await botBridge.sendGroupMessage(id, body.message.trim());
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof BotApiError ? error.message : "Failed to send message";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
