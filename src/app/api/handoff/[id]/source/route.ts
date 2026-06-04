import { NextResponse } from "next/server";

import { getHandoffSource } from "@/logic/handoffRegistry";

// Streams the source image bytes for a pending handoff task so the external
// worker can inspect/edit it.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const source = getHandoffSource(id);
  if (!source) {
    return NextResponse.json({ error: "No such pending handoff" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(source.data), {
    headers: { "Content-Type": source.mimeType, "Cache-Control": "no-store" },
  });
}
