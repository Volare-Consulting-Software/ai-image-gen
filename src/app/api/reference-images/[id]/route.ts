import { NextResponse } from "next/server";

import { getStorage } from "@/container";
import { prisma } from "@/db/client";

// Streams a user-uploaded reference photo's bytes from object storage, so the
// project page can display the references that influenced its images.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const reference = await prisma.referenceImage.findUnique({ where: { id } });
  if (!reference || !reference.s3Key) {
    return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
  }
  const bytes = await getStorage().get(reference.s3Key);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": reference.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
