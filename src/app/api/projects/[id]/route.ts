import { NextResponse } from "next/server";

import { getProjectDetail } from "@/logic/projectQueries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
