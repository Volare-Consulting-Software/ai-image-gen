import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { projectService } from "@/logic/projectService";
import { listProjects } from "@/logic/projectQueries";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  prompt: z.string().trim().min(3, "Describe what you'd like to create").max(2000),
  referenceImageId: z.string().min(1).optional(),
});

export async function GET(): Promise<Response> {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const project = await projectService.createProject(
    parsed.data.prompt,
    parsed.data.referenceImageId,
  );
  logger.info({ projectId: project.id }, "project created");
  return NextResponse.json({ project }, { status: 201 });
}
