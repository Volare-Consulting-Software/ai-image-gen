import { NextResponse } from "next/server";

export function GET(): Response {
  return NextResponse.json({ ok: true });
}
