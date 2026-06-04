import sharp from "sharp";

import type { ImageRefiner, RefineInput } from "@/interfaces/imageRefiner";
import type { GeneratedImage } from "@/types/generation";

// Zero-cost stand-in for the Claude refiner. Applies a real sharpen / normalise
// / saturation pass with sharp so the "technical refinement" is visible in the
// UI without spawning the Claude Agent SDK or spending tokens.
export class FixtureImageRefiner implements ImageRefiner {
  async refine(input: RefineInput): Promise<GeneratedImage> {
    const data = await sharp(input.source)
      .sharpen()
      .normalize()
      .modulate({ saturation: 1.1 })
      .png()
      .toBuffer();
    return { data, mimeType: "image/png" };
  }
}
