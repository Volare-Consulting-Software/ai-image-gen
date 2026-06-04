import { NextResponse } from "next/server";

import { listHandoffs } from "@/logic/handoffRegistry";

// Pending polish tasks awaiting an external Claude Code session. Each entry has
// the instructions and the source image id; fetch the bytes from
// GET /api/handoff/[id]/source and post the result to /api/handoff/[id]/result.
export function GET(): Response {
  return NextResponse.json({ tasks: listHandoffs() });
}
