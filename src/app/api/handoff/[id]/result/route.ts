import { NextResponse, type NextRequest } from "next/server";

import { resolveHandoff } from "@/logic/handoffRegistry";

// Post the refined image back to resume a paused polish step. Two ways to send:
//  - raw image bytes as the body, with the image Content-Type (e.g. image/png)
//  - JSON: { "imageBase64": "...", "mimeType": "image/png" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const contentType = req.headers.get("content-type") ?? "application/octet-stream";

  let data: Buffer;
  let mimeType: string;

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | { imageBase64?: string; mimeType?: string }
      | null;
    if (!body?.imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }
    data = Buffer.from(body.imageBase64, "base64");
    mimeType = body.mimeType ?? "image/png";
  } else {
    data = Buffer.from(await req.arrayBuffer());
    mimeType = contentType === "application/octet-stream" ? "image/png" : contentType;
  }

  if (data.length === 0) {
    return NextResponse.json({ error: "Empty image body" }, { status: 400 });
  }

  const ok = resolveHandoff(id, { data, mimeType });
  if (!ok) {
    return NextResponse.json({ error: "No such pending handoff" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bytes: data.length });
}
