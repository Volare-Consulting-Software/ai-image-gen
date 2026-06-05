import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";

const pickupSchema = z.object({ imageId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = pickupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await projectService.pickUpFrom(id, parsed.data.imageId);
  return NextResponse.json({ ok: true });
}
