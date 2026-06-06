import { NextResponse, type NextRequest } from "next/server";

import { getStorage } from "@/container";
import { prisma } from "@/db/client";
import { logger } from "@/lib/logger";
import {
  extForMime,
  REFERENCE_IMAGE_MAX_BYTES,
  REFERENCE_IMAGE_MIME_TYPES,
} from "@/lib/referenceImage";

// Accepts a single user-uploaded reference photo (multipart/form-data, field
// "file"), stores it in object storage, and returns an id to attach to a
// prompt. The bytes must live server-side because Gemini work runs async in the
// job processor, long after this request returns.
export async function POST(req: NextRequest): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mimeType = file.type;
  if (!(REFERENCE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPEG, or WebP." },
      { status: 415 },
    );
  }
  if (file.size > REFERENCE_IMAGE_MAX_BYTES) {
    const maxMb = Math.round(REFERENCE_IMAGE_MAX_BYTES / (1024 * 1024));
    return NextResponse.json({ error: `Image is too large (max ${maxMb} MB).` }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Create the row first to mint an id, then key the object by that id (mirrors
  // how generated images are persisted).
  const row = await prisma.referenceImage.create({
    data: { s3Key: "", mimeType, bytes: bytes.byteLength },
  });
  const key = `references/${row.id}.${extForMime(mimeType)}`;
  await getStorage().put(key, bytes, mimeType);
  await prisma.referenceImage.update({ where: { id: row.id }, data: { s3Key: key } });

  logger.info({ referenceImageId: row.id, bytes: bytes.byteLength }, "reference image uploaded");
  return NextResponse.json({ id: row.id, mimeType }, { status: 201 });
}
