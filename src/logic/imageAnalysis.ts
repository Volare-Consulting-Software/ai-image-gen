import sharp from "sharp";

export interface ImageTags {
  // Simple/flat enough (few colors) to vectorize to SVG.
  shapeAvailable: boolean;
  // Background is near-uniform white or black, so PNG can be made transparent.
  transparentBgAvailable: boolean;
}

const SHAPE_MAX_COLORS = 24; // distinct 3-bit/channel colors at 64×64
const NEAR_WHITE = 240;
const NEAR_BLACK = 15;

// Heuristic analysis used to tag an image's export capabilities at generation
// time. Cheap: runs on a 64×64 downscale. Best-effort — thresholds are tunable.
export async function analyzeImage(buffer: Buffer): Promise<ImageTags> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(64, 64, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const at = (x: number, y: number): [number, number, number] => {
      const i = (y * width + x) * channels;
      return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    };

    // Distinct quantized colors → shape suitability.
    const colors = new Set<number>();
    for (let i = 0; i < data.length; i += channels) {
      const r = (data[i] ?? 0) >> 5;
      const g = (data[i + 1] ?? 0) >> 5;
      const b = (data[i + 2] ?? 0) >> 5;
      colors.add((r << 6) | (g << 3) | b);
    }
    const shapeAvailable = colors.size <= SHAPE_MAX_COLORS;

    // Border sample → transparent-bg suitability (near-uniform white or black).
    const border: Array<[number, number, number]> = [];
    for (let x = 0; x < width; x++) {
      border.push(at(x, 0), at(x, height - 1));
    }
    for (let y = 0; y < height; y++) {
      border.push(at(0, y), at(width - 1, y));
    }
    const allWhite = border.every(([r, g, b]) => r >= NEAR_WHITE && g >= NEAR_WHITE && b >= NEAR_WHITE);
    const allBlack = border.every(([r, g, b]) => r <= NEAR_BLACK && g <= NEAR_BLACK && b <= NEAR_BLACK);

    return { shapeAvailable, transparentBgAvailable: allWhite || allBlack };
  } catch {
    return { shapeAvailable: false, transparentBgAvailable: false };
  }
}
