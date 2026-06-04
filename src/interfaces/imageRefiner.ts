import type { GeneratedImage } from "@/types/generation";

export interface RefineInput {
  projectId: string;
  // Monotonic round number — used to isolate the scratch working directory.
  roundIndex: number;
  source: Buffer;
  mimeType: string;
  // What to improve. On the first (auto) pass this is a default enhancement
  // brief; on later passes it carries the user's suggestions.
  instructions: string;
}

// The technical-refinement engine (Claude Agent SDK driving image-editing CLI
// tools — sharp / ImageMagick now, GIMP later).
export interface ImageRefiner {
  refine(input: RefineInput): Promise<GeneratedImage>;
}

export const ImageRefinerToken = Symbol.for("ImageRefiner");
