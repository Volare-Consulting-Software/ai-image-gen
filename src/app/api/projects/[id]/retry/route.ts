import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";

// Re-run candidate generation for a project that errored, with a (possibly
// edited) prompt. Any attached reference image is reused automatically.
const retrySchema = z.object({
  prompt: z.string().trim().min(3, "Describe what you'd like to create").max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = retrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  await projectService.regenerate(id, parsed.data.prompt);
  return NextResponse.json({ ok: true });
}
