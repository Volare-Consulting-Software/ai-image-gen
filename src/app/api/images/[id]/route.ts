import { NextResponse } from "next/server";

import { getStorage } from "@/container";
import { prisma } from "@/db/client";

// Streams an image's bytes from object storage. Streaming (rather than
// redirecting to a presigned URL) works identically in local Docker — where the
// MinIO endpoint hostname isn't reachable from the browser — and in prod.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image || !image.s3Key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
  const bytes = await getStorage().get(image.s3Key);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
