import { NextResponse } from "next/server";

import { prisma } from "@/db/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> },
): Promise<Response> {
  const { id, jobId } = await params;
  const job = await prisma.job.findFirst({ where: { id: jobId, projectId: id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    error: job.error,
    resultImageIds: job.resultImageIds,
  });
}
