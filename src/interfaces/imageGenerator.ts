import type { ClarificationResult } from "@/types/clarification";
import type { GeneratedImage } from "@/types/generation";

// The creative engine (Google Gemini "nano-banana"): prompt refinement,
// candidate generation, and conversational style edits.
export interface ImageGenerator {
  // Decide whether a prompt is vague and, if so, produce a few high-impact
  // clarifying questions.
  clarify(prompt: string): Promise<ClarificationResult>;

  // Generate `count` independent candidates for the prompt.
  generateCandidates(prompt: string, count: number): Promise<GeneratedImage[]>;

  // Re-edit a single image with a natural-language style instruction.
  editImage(source: Buffer, mimeType: string, instruction: string): Promise<GeneratedImage>;
}

export const ImageGeneratorToken = Symbol.for("ImageGenerator");
