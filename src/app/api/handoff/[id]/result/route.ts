import { NextResponse, type NextRequest } from "next/server";

import { resolveHandoff } from "@/logic/handoffRegistry";
import type { ImageUsage } from "@/types/generation";

const num = (v: string | null | undefined): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// Post the refined image back to resume a paused polish step. Two ways to send:
//  - raw image bytes as the body, with the image Content-Type (e.g. image/png).
//    Optionally report usage via headers: x-model, x-input-tokens,
//    x-output-tokens, x-cost-usd.
//  - JSON: { imageBase64, mimeType?, model?, inputTokens?, outputTokens?, costUsd? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const contentType = req.headers.get("content-type") ?? "application/octet-stream";

  let data: Buffer;
  let mimeType: string;
  let usage: ImageUsage | undefined;

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as
      | {
          imageBase64?: string;
          mimeType?: string;
          model?: string;
          inputTokens?: number;
          outputTokens?: number;
          costUsd?: number;
        }
      | null;
    if (!body?.imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }
    data = Buffer.from(body.imageBase64, "base64");
    mimeType = body.mimeType ?? "image/png";
    usage = {
      model: body.model ?? "Claude Code (handoff)",
      inputTokens: body.inputTokens,
      outputTokens: body.outputTokens,
      costUsd: body.costUsd,
    };
  } else {
    data = Buffer.from(await req.arrayBuffer());
    mimeType = contentType === "application/octet-stream" ? "image/png" : contentType;
    usage = {
      model: req.headers.get("x-model") ?? "Claude Code (handoff)",
      inputTokens: num(req.headers.get("x-input-tokens")),
      outputTokens: num(req.headers.get("x-output-tokens")),
      costUsd: num(req.headers.get("x-cost-usd")),
    };
  }

  if (data.length === 0) {
    return NextResponse.json({ error: "Empty image body" }, { status: 400 });
  }

  const ok = resolveHandoff(id, { data, mimeType, usage });
  if (!ok) {
    return NextResponse.json({ error: "No such pending handoff" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bytes: data.length });
}
