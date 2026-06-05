import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";

// Resolves a CHOOSING gate: pick a candidate as-is, pick it with style
// suggestions (loops back to Gemini), or reject all three and regenerate.
const selectSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("as_is"), imageId: z.string().min(1) }),
  z.object({ action: z.literal("finish"), imageId: z.string().min(1) }),
  z.object({
    action: z.literal("with_suggestions"),
    imageId: z.string().min(1),
    suggestions: z.string().trim().min(1, "Describe what to change").max(2000),
  }),
  z.object({ action: z.literal("try_again"), feedback: z.string().trim().max(2000).optional() }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = selectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;
  switch (data.action) {
    case "as_is":
      await projectService.selectAsIs(id, data.imageId);
      break;
    case "finish":
      await projectService.acceptAsFinal(id, data.imageId);
      break;
    case "with_suggestions":
      await projectService.selectWithSuggestions(id, data.imageId, data.suggestions);
      break;
    case "try_again":
      await projectService.tryAgain(id, data.feedback);
      break;
  }
  return NextResponse.json({ ok: true });
}
