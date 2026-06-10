import { NextRequest, NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";
import { BotApiError } from "@/lib/bot-api-client";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const enabled = Boolean(body.enabled);

    const result = await botBridge.toggleCommand(id, enabled);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof BotApiError ? error.message : "Failed to toggle command";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
