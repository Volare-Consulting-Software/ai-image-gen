import type { ImageRefiner, RefineInput } from "@/interfaces/imageRefiner";
import { createHandoff } from "@/logic/handoffRegistry";
import { logger } from "@/lib/logger";
import type { GeneratedImage } from "@/types/generation";

// Dev refiner that hands the polish step off to an external worker (the
// developer's Claude Code session) instead of calling the Claude API. The job
// pauses here until the result bytes are posted back to /api/handoff/[id]/result.
export class HandoffImageRefiner implements ImageRefiner {
  refine(input: RefineInput): Promise<GeneratedImage> {
    logger.info(
      { projectId: input.projectId, sourceImageId: input.sourceImageId },
      "polish handed off — awaiting result via POST /api/handoff/[id]/result",
    );
    return createHandoff({
      projectId: input.projectId,
      sourceImageId: input.sourceImageId,
      roundIndex: input.roundIndex,
      instructions: input.instructions,
      mimeType: input.mimeType,
      source: input.source,
    });
  }
}
