import { GateKind, GateStatus, ImageStage, JobType, ProjectStatus } from "@/generated/prisma/enums";
import type { Project } from "@/generated/prisma/client";
import { prisma } from "@/db/client";
import { nudgeJobs } from "@/logic/events";
import type { ClarificationAnswer } from "@/types/clarification";
import type {
  ClarifyPayload,
  ClaudeRefinePayload,
  GeminiEditPayload,
  GeneratePayload,
} from "@/types/jobs";

// The default brief for Claude's automatic first refinement pass.
export const DEFAULT_REFINE_BRIEF =
  "Apply a balanced technical clean-up: sharpen for clarity, gently denoise, " +
  "normalise contrast and levels, and tidy jagged edges/lines without altering " +
  "the subject, composition, or style.";

function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "Untitled project";
}

// State authority for user/API-driven transitions. Engine-result transitions
// live in jobProcessor.ts. Both enqueue jobs and create/resolve gates.
export class ProjectService {
  // ---- creation -----------------------------------------------------------

  async createProject(originalPrompt: string): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        title: deriveTitle(originalPrompt),
        originalPrompt,
        status: ProjectStatus.clarifying,
      },
    });
    await this.enqueue(project.id, JobType.clarify, { prompt: originalPrompt } satisfies ClarifyPayload);
    return project;
  }

  // ---- CLARIFYING ---------------------------------------------------------

  async submitClarifications(projectId: string, answers: ClarificationAnswer[]): Promise<void> {
    const project = await this.requireProject(projectId);

    await this.resolvePendingGate(projectId, { answers });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.generating },
    });
    // The generate job synthesizes original + answers into a vivid prompt (and
    // records it on the project) before generating candidates.
    await this.enqueue(projectId, JobType.generate, {
      original: project.originalPrompt,
      answers,
    } satisfies GeneratePayload);
  }

  // ---- CHOOSING (3-up) ----------------------------------------------------

  async selectAsIs(projectId: string, imageId: string): Promise<void> {
    await this.requireProject(projectId);
    await this.resolvePendingGate(projectId, { action: "as_is", imageId });
    await prisma.project.update({
      where: { id: projectId },
      data: { selectedImageId: imageId, status: ProjectStatus.claude_refining },
    });
    await this.enqueue(projectId, JobType.claude_refine, {
      sourceImageId: imageId,
      instructions: DEFAULT_REFINE_BRIEF,
      auto: true,
    } satisfies ClaudeRefinePayload);
  }

  async selectWithSuggestions(
    projectId: string,
    imageId: string,
    suggestions: string,
  ): Promise<void> {
    await this.requireProject(projectId);
    await this.resolvePendingGate(projectId, { action: "with_suggestions", imageId, suggestions });
    await prisma.project.update({
      where: { id: projectId },
      data: { selectedImageId: imageId, status: ProjectStatus.gemini_refining },
    });
    await this.enqueue(projectId, JobType.gemini_edit, {
      sourceImageId: imageId,
      instruction: suggestions,
    } satisfies GeminiEditPayload);
  }

  async tryAgain(projectId: string, feedback?: string): Promise<void> {
    const project = await this.requireProject(projectId);
    const prompt = feedback
      ? `${project.refinedPrompt ?? project.originalPrompt}\n\nAdditional direction: ${feedback}`
      : (project.refinedPrompt ?? project.originalPrompt);

    await this.resolvePendingGate(projectId, { action: "try_again", feedback });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.generating },
    });
    await this.enqueue(projectId, JobType.generate, { prompt } satisfies GeneratePayload);
  }

  // ---- GEMINI_REFINING (single image loop) --------------------------------

  async geminiHappy(projectId: string): Promise<void> {
    const project = await this.requireProject(projectId);
    const imageId = this.requireSelected(project);
    await this.resolvePendingGate(projectId, { action: "happy" });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.claude_refining },
    });
    await this.enqueue(projectId, JobType.claude_refine, {
      sourceImageId: imageId,
      instructions: DEFAULT_REFINE_BRIEF,
      auto: true,
    } satisfies ClaudeRefinePayload);
  }

  async geminiMore(projectId: string, suggestions: string): Promise<void> {
    const project = await this.requireProject(projectId);
    const imageId = this.requireSelected(project);
    await this.resolvePendingGate(projectId, { action: "more", suggestions });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.gemini_refining },
    });
    await this.enqueue(projectId, JobType.gemini_edit, {
      sourceImageId: imageId,
      instruction: suggestions,
    } satisfies GeminiEditPayload);
  }

  // ---- CLAUDE_REFINING (technical loop) -----------------------------------

  async claudeDone(projectId: string): Promise<void> {
    await this.requireProject(projectId);
    await this.resolvePendingGate(projectId, { action: "done" });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.complete },
    });
  }

  async claudeRefineMore(projectId: string, suggestions: string): Promise<void> {
    const project = await this.requireProject(projectId);
    const imageId = this.requireSelected(project);
    await this.resolvePendingGate(projectId, { action: "refine", suggestions });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.claude_refining },
    });
    await this.enqueue(projectId, JobType.claude_refine, {
      sourceImageId: imageId,
      instructions: suggestions,
      auto: false,
    } satisfies ClaudeRefinePayload);
  }

  // ---- pick up from an earlier image --------------------------------------

  // Resume the project from any historical image — for when a later path went
  // the wrong way. Re-enters the refine loop that matches the image's stage so
  // the user can continue (restyle or polish) from that point.
  async pickUpFrom(projectId: string, imageId: string): Promise<void> {
    await this.requireProject(projectId);
    const image = await prisma.image.findFirst({ where: { id: imageId, projectId } });
    if (!image) {
      throw new Error(`Image not found in project: ${imageId}`);
    }

    const polishing = image.stage === ImageStage.claude_refine;
    const status = polishing ? ProjectStatus.claude_refining : ProjectStatus.gemini_refining;
    const gateKind = polishing ? GateKind.claude_refine : GateKind.gemini_refine;
    const summary = polishing
      ? "Continuing from an earlier image. Refine it further, or finish."
      : "Continuing from an earlier image. Restyle it, or move on to polish.";

    await this.resolvePendingGate(projectId, { action: "pick_up", imageId });
    await prisma.project.update({
      where: { id: projectId },
      data: { selectedImageId: imageId, status },
    });
    await createGate(projectId, gateKind, summary);
  }

  // ---- helpers ------------------------------------------------------------

  async enqueue(projectId: string, type: JobType, payload: unknown): Promise<void> {
    await prisma.job.create({
      data: { projectId, type, payload: payload as object },
    });
    nudgeJobs();
  }

  private async resolvePendingGate(projectId: string, payload: unknown): Promise<void> {
    await prisma.gate.updateMany({
      where: { projectId, status: GateStatus.pending },
      data: {
        status: GateStatus.resolved,
        resolutionPayload: payload as object,
        resolvedAt: new Date(),
      },
    });
  }

  private async requireProject(projectId: string): Promise<Project> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  private requireSelected(project: Project): string {
    if (!project.selectedImageId) {
      throw new Error(`Project ${project.id} has no selected image`);
    }
    return project.selectedImageId;
  }
}

export const projectService = new ProjectService();

// Shared gate factory used by the job processor when an engine result needs a
// new pending decision.
export async function createGate(
  projectId: string,
  kind: GateKind,
  summary: string,
  options: unknown = [],
): Promise<void> {
  await prisma.gate.create({
    data: { projectId, kind, summary, options: options as object },
  });
}
