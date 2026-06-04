import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";

// Resolves a refinement-loop gate. `happy`/`more` belong to the Gemini single-
// image loop; `done`/`refine` belong to the Claude technical loop.
const refineSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("happy") }),
  z.object({ action: z.literal("finish") }),
  z.object({
    action: z.literal("more"),
    suggestions: z.string().trim().min(1, "Describe what to change").max(2000),
  }),
  z.object({ action: z.literal("done") }),
  z.object({
    action: z.literal("refine"),
    suggestions: z.string().trim().min(1, "Describe what to refine").max(2000),
  }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = refineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;
  switch (data.action) {
    case "happy":
      await projectService.geminiHappy(id);
      break;
    case "finish":
      await projectService.acceptAsFinal(id);
      break;
    case "more":
      await projectService.geminiMore(id, data.suggestions);
      break;
    case "done":
      await projectService.claudeDone(id);
      break;
    case "refine":
      await projectService.claudeRefineMore(id, data.suggestions);
      break;
  }
  return NextResponse.json({ ok: true });
}
