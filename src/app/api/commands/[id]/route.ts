import { NextRequest, NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const enabled = Boolean(body.enabled);

  const result = botBridge.toggleCommand(id, enabled);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
