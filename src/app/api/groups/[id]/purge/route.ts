import { NextRequest, NextResponse } from "next/server";
import { botBridge } from "@/lib/bot-bridge";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const result = botBridge.purgeGroup(id, body.confirm ?? "");
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
