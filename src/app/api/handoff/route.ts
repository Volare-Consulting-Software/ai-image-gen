import { NextResponse, type NextRequest } from "next/server";

import { buildHandoffBrief } from "@/logic/handoffBrief";
import { listHandoffs } from "@/logic/handoffRegistry";
import { baseUrlFromHeaders } from "@/lib/requestUrl";

// Pending polish tasks awaiting an external Claude session. Each entry includes a
// paste-ready `brief` plus the source/result URLs.
export function GET(req: NextRequest): Response {
  const base = baseUrlFromHeaders(req.headers);
  const tasks = listHandoffs().map((task) => ({
    ...task,
    sourceUrl: `${base}/api/handoff/${task.id}/source`,
    resultUrl: `${base}/api/handoff/${task.id}/result`,
    brief: buildHandoffBrief(task, base),
  }));
  return NextResponse.json({ tasks });
}
