import { randomUUID } from "node:crypto";

import {
  GateKind,
  ImageEngine,
  ImageStage,
  JobStatus,
  JobType,
  ProjectStatus,
} from "@/generated/prisma/enums";
import type { Image, Job } from "@/generated/prisma/client";
import { prisma } from "@/db/client";
import { getImageGenerator, getImageRefiner, getStorage } from "@/container";
import { bus, JOB_NUDGE } from "@/logic/events";
import { createGate } from "@/logic/projectService";
import { logger } from "@/lib/logger";
import type { GeneratedImage } from "@/types/generation";
import type {
  ClarifyPayload,
  ClaudeRefinePayload,
  GeminiEditPayload,
  GeneratePayload,
} from "@/types/jobs";

const POLL_INTERVAL_MS = 2000;
const DEFAULT_CANDIDATE_COUNT = 3;

// How many candidates to generate in the CHOOSING step. Override with
// CANDIDATE_COUNT (e.g. 1 while testing to save tokens).
function candidateCount(): number {
  const n = Number(process.env.CANDIDATE_COUNT);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_CANDIDATE_COUNT;
}

function extFor(mimeType: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

// In-process job runner. A single App Runner instance (min=max=1) owns the
// queue; a 2s poll plus an event nudge keeps latency low without contention.
export class JobProcessor {
  private started = false;
  private ticking = false;
  private timer: NodeJS.Timeout | undefined;

  start(): void {
    if (this.started) return;
    this.started = true;
    bus.on(JOB_NUDGE, () => void this.tick());
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    if (this.timer.unref) this.timer.unref();
    void this.tick();
    logger.info("job processor started");
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // Drain the queue one job at a time.
      for (;;) {
        const job = await this.claimNext();
        if (!job) break;
        await this.run(job);
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "job tick failed");
    } finally {
      this.ticking = false;
    }
  }

  private async claimNext(): Promise<Job | null> {
    const next = await prisma.job.findFirst({
      where: { status: JobStatus.queued },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;
    const claimed = await prisma.job.updateMany({
      where: { id: next.id, status: JobStatus.queued },
      data: { status: JobStatus.running, startedAt: new Date() },
    });
    if (claimed.count === 0) return null; // lost the race (shouldn't happen single-instance)
    return next;
  }

  private async run(job: Job): Promise<void> {
    try {
      const resultImageIds = await this.dispatch(job);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.done, finishedAt: new Date(), resultImageIds },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ jobId: job.id, type: job.type, err: message }, "job failed");
      await prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.error, finishedAt: new Date(), error: message },
      });
      await prisma.project.update({
        where: { id: job.projectId },
        data: { status: ProjectStatus.error },
      });
    }
  }

  private async dispatch(job: Job): Promise<string[]> {
    switch (job.type) {
      case JobType.clarify:
        return this.handleClarify(job);
      case JobType.generate:
        return this.handleGenerate(job);
      case JobType.gemini_edit:
        return this.handleGeminiEdit(job);
      case JobType.claude_refine:
        return this.handleClaudeRefine(job);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  // ---- handlers -----------------------------------------------------------

  private async handleClarify(job: Job): Promise<string[]> {
    const { prompt } = job.payload as unknown as ClarifyPayload;
    const result = await getImageGenerator().clarify(prompt);

    if (result.isVague && result.questions.length > 0) {
      await createGate(
        job.projectId,
        GateKind.clarify,
        "A few quick questions to sharpen your prompt",
        result.questions,
      );
      // Project stays in `clarifying` awaiting answers.
      return [];
    }

    // Prompt is clear enough — proceed straight to generation.
    await prisma.project.update({
      where: { id: job.projectId },
      data: { refinedPrompt: prompt, status: ProjectStatus.generating },
    });
    await prisma.job.create({
      data: {
        projectId: job.projectId,
        type: JobType.generate,
        payload: { prompt } satisfies GeneratePayload,
      },
    });
    return [];
  }

  private async handleGenerate(job: Job): Promise<string[]> {
    const payload = job.payload as unknown as GeneratePayload;
    const generator = getImageGenerator();

    // Synthesize a vivid prompt from the clarifying answers when needed, and
    // record it on the project so it's visible in the UI.
    let prompt = payload.prompt;
    if (!prompt && payload.answers) {
      prompt = await generator.refinePrompt(payload.original ?? "", payload.answers);
      await prisma.project.update({
        where: { id: job.projectId },
        data: { refinedPrompt: prompt },
      });
    }
    if (!prompt) prompt = payload.original ?? "";

    const candidates = await generator.generateCandidates(prompt, candidateCount());
    const groupId = randomUUID();
    const round = await this.nextRound(job.projectId);

    const images: Image[] = [];
    for (const candidate of candidates) {
      images.push(
        await this.persistImage(candidate, {
          projectId: job.projectId,
          stage: ImageStage.candidate,
          engine: ImageEngine.gemini,
          promptOrInstruction: prompt,
          candidateGroupId: groupId,
          roundIndex: round,
        }),
      );
    }

    await prisma.project.update({
      where: { id: job.projectId },
      data: { status: ProjectStatus.choosing },
    });
    await createGate(
      job.projectId,
      GateKind.choose,
      "Pick the image closest to what you want",
      images.map((img) => ({ imageId: img.id })),
    );
    return images.map((img) => img.id);
  }

  private async handleGeminiEdit(job: Job): Promise<string[]> {
    const { sourceImageId, instruction } = job.payload as unknown as GeminiEditPayload;
    const source = await this.loadImage(sourceImageId);
    const sourceBytes = await getStorage().get(source.s3Key);

    const edited = await getImageGenerator().editImage(sourceBytes, source.mimeType, instruction);
    const round = await this.nextRound(job.projectId);
    const image = await this.persistImage(edited, {
      projectId: job.projectId,
      stage: ImageStage.gemini_refine,
      engine: ImageEngine.gemini,
      promptOrInstruction: instruction,
      parentImageId: sourceImageId,
      roundIndex: round,
    });

    await prisma.project.update({
      where: { id: job.projectId },
      data: { selectedImageId: image.id, status: ProjectStatus.gemini_refining },
    });
    await createGate(
      job.projectId,
      GateKind.gemini_refine,
      "Happy with this, or want more changes?",
    );
    return [image.id];
  }

  private async handleClaudeRefine(job: Job): Promise<string[]> {
    const { sourceImageId, instructions } = job.payload as unknown as ClaudeRefinePayload;
    const source = await this.loadImage(sourceImageId);
    const sourceBytes = await getStorage().get(source.s3Key);
    const round = await this.nextRound(job.projectId);

    const refined = await getImageRefiner().refine({
      projectId: job.projectId,
      roundIndex: round,
      source: sourceBytes,
      mimeType: source.mimeType,
      instructions,
    });
    const image = await this.persistImage(refined, {
      projectId: job.projectId,
      stage: ImageStage.claude_refine,
      engine: ImageEngine.claude,
      promptOrInstruction: instructions,
      parentImageId: sourceImageId,
      roundIndex: round,
    });

    await prisma.project.update({
      where: { id: job.projectId },
      data: { selectedImageId: image.id, status: ProjectStatus.claude_refining },
    });
    await createGate(
      job.projectId,
      GateKind.claude_refine,
      "Refined. Done, or refine further?",
    );
    return [image.id];
  }

  // ---- persistence helpers ------------------------------------------------

  private async persistImage(
    generated: GeneratedImage,
    meta: {
      projectId: string;
      stage: ImageStage;
      engine: ImageEngine;
      promptOrInstruction: string;
      parentImageId?: string;
      candidateGroupId?: string;
      roundIndex: number;
    },
  ): Promise<Image> {
    // Create the row first to mint an id, then key the S3 object by that id.
    const row = await prisma.image.create({
      data: {
        projectId: meta.projectId,
        s3Key: "",
        mimeType: generated.mimeType,
        width: generated.width,
        height: generated.height,
        stage: meta.stage,
        engine: meta.engine,
        promptOrInstruction: meta.promptOrInstruction,
        parentImageId: meta.parentImageId,
        candidateGroupId: meta.candidateGroupId,
        roundIndex: meta.roundIndex,
      },
    });
    const key = `projects/${meta.projectId}/${row.id}.${extFor(generated.mimeType)}`;
    await getStorage().put(key, generated.data, generated.mimeType);
    return prisma.image.update({ where: { id: row.id }, data: { s3Key: key } });
  }

  private async loadImage(imageId: string): Promise<Image> {
    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new Error(`Image not found: ${imageId}`);
    }
    return image;
  }

  private async nextRound(projectId: string): Promise<number> {
    const agg = await prisma.image.aggregate({
      where: { projectId },
      _max: { roundIndex: true },
    });
    return (agg._max.roundIndex ?? -1) + 1;
  }
}

export const jobProcessor = new JobProcessor();
