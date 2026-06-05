import sharp from "sharp";
import ImageTracer from "imagetracerjs";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";
export type SizeTier = "xs" | "s" | "m" | "l" | "xl";

// Standard longest-edge dimensions, anchored at 32 (×4 up to large, capped at 4096).
const SIZES: Record<SizeTier, number> = { xs: 32, s: 128, m: 512, l: 2048, xl: 4096 };
const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};
const EXT: Record<ExportFormat, string> = { png: "png", jpeg: "jpg", webp: "webp", svg: "svg" };

const NEAR_WHITE = 245;
const NEAR_BLACK = 12;
const FUZZ = 36;

export interface ExportResult {
  data: Buffer;
  contentType: string;
  ext: string;
}

export function isExportFormat(v: string): v is ExportFormat {
  return v === "png" || v === "jpeg" || v === "webp" || v === "svg";
}

export function isSizeTier(v: string): v is SizeTier {
  return v === "xs" || v === "s" || v === "m" || v === "l" || v === "xl";
}

export async function exportImage(
  source: Buffer,
  opts: { format: ExportFormat; size: SizeTier; makeTransparent: boolean },
): Promise<ExportResult> {
  if (opts.format === "svg") {
    return exportSvg(source, SIZES[opts.size]);
  }

  const dim = SIZES[opts.size];
  // Knock out a white/black background before resizing (alpha survives resize).
  const base =
    opts.format === "png" && opts.makeTransparent ? await makeBackgroundTransparent(source) : source;

  const pipeline = sharp(base).resize(dim, dim, { fit: "inside" });
  let out: Buffer;
  if (opts.format === "png") {
    out = await pipeline.png().toBuffer();
  } else if (opts.format === "jpeg") {
    // JPEG has no alpha — flatten onto white.
    out = await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  } else {
    out = await pipeline.webp({ quality: 90 }).toBuffer();
  }
  return { data: out, contentType: MIME[opts.format], ext: EXT[opts.format] };
}

async function makeBackgroundTransparent(source: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const corner = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * channels;
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
  };
  const corners = [corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1)];
  const isWhite = corners.every(([r, g, b]) => r >= NEAR_WHITE && g >= NEAR_WHITE && b >= NEAR_WHITE);
  const isBlack = corners.every(([r, g, b]) => r <= NEAR_BLACK && g <= NEAR_BLACK && b <= NEAR_BLACK);
  if (!isWhite && !isBlack) {
    return source; // nothing obvious to remove
  }

  const buf = Buffer.from(data);
  for (let i = 0; i < buf.length; i += channels) {
    const r = buf[i] ?? 0;
    const g = buf[i + 1] ?? 0;
    const b = buf[i + 2] ?? 0;
    const matches = isWhite
      ? r >= 255 - FUZZ && g >= 255 - FUZZ && b >= 255 - FUZZ
      : r <= FUZZ && g <= FUZZ && b <= FUZZ;
    if (matches) {
      buf[i + 3] = 0;
    }
  }
  return sharp(buf, { raw: { width, height, channels } }).png().toBuffer();
}

async function exportSvg(source: Buffer, dim: number): Promise<ExportResult> {
  // Trace at a capped raster size — the SVG is resolution-independent anyway.
  const traceDim = Math.min(dim, 512);
  const { data, info } = await sharp(source)
    .resize(traceDim, traceDim, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const svg = ImageTracer.imagedataToSVG(
    { width: info.width, height: info.height, data: new Uint8ClampedArray(data) },
    "default",
  );
  return { data: Buffer.from(svg, "utf8"), contentType: MIME.svg, ext: EXT.svg };
}
