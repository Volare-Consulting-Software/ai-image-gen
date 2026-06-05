import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";

const clarifySchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = clarifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await projectService.submitClarifications(id, parsed.data.answers);
  return NextResponse.json({ ok: true });
}
