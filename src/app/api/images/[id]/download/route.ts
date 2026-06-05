import { NextResponse, type NextRequest } from "next/server";

import { getStorage } from "@/container";
import { prisma } from "@/db/client";
import { exportImage, isExportFormat, isSizeTier } from "@/logic/imageExport";

// Download an image in a chosen format + size tier. PNG is made transparent when
// the image was tagged as having a white/black background. SVG is always
// offered; the trace is only viable when a clean shape can be captured, so a
// non-shape image returns a structured 422 the client turns into a refine hint.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "png";
  const size = url.searchParams.get("size") ?? "l";

  if (!isExportFormat(format) || !isSizeTier(size)) {
    return NextResponse.json({ error: "Invalid format or size" }, { status: 400 });
  }

  const image = await prisma.image.findUnique({ where: { id } });
  if (!image || !image.s3Key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
  if (format === "svg" && !image.shapeAvailable) {
    return NextResponse.json(
      {
        error: "A clean shape couldn't be captured from this image, so it can't be vectorized to SVG.",
        code: "svg_no_shape",
      },
      { status: 422 },
    );
  }

  const source = await getStorage().get(image.s3Key);
  const result = await exportImage(source, {
    format,
    size,
    makeTransparent: format === "png" && image.transparentBgAvailable,
  });

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="ai-image-${id}-${size}.${result.ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
