import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock persistence + event bus so we can assert the state transitions in
// isolation (no database, no runner).
const { prismaMock, nudgeMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    job: { create: vi.fn() },
    gate: { updateMany: vi.fn() },
  },
  nudgeMock: vi.fn(),
}));

vi.mock("@/db/client", () => ({ prisma: prismaMock }));
vi.mock("@/logic/events", () => ({ nudgeJobs: nudgeMock, bus: {}, JOB_NUDGE: "job:nudge" }));

import { ProjectService } from "@/logic/projectService";
import { JobType, ProjectStatus } from "@/generated/prisma/enums";

const svc = new ProjectService();

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.project.create.mockResolvedValue({ id: "p1", originalPrompt: "x", refinedPrompt: null });
  prismaMock.project.update.mockResolvedValue({});
  prismaMock.job.create.mockResolvedValue({});
  prismaMock.gate.updateMany.mockResolvedValue({ count: 1 });
});

describe("ProjectService", () => {
  it("createProject_vaguePrompt_createsClarifyingProjectAndClarifyJob", async () => {
    await svc.createProject("a logo");

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalPrompt: "a logo", status: ProjectStatus.clarifying }),
      }),
    );
    expect(prismaMock.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "p1", type: JobType.clarify, payload: { prompt: "a logo" } }),
      }),
    );
    expect(nudgeMock).toHaveBeenCalledOnce();
  });

  it("selectAsIs_movesToClaudeRefiningWithAutoPass", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1" });

    await svc.selectAsIs("p1", "img1");

    expect(prismaMock.gate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "resolved" }) }),
    );
    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ selectedImageId: "img1", status: ProjectStatus.claude_refining }),
      }),
    );
    expect(prismaMock.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: JobType.claude_refine,
          payload: expect.objectContaining({ sourceImageId: "img1", userInstructions: "" }),
        }),
      }),
    );
  });

  it("selectWithSuggestions_movesToGeminiRefiningWithEditJob", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1" });

    await svc.selectWithSuggestions("p1", "img2", "warmer palette");

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ selectedImageId: "img2", status: ProjectStatus.gemini_refining }),
      }),
    );
    expect(prismaMock.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: JobType.gemini_edit,
          payload: { sourceImageId: "img2", instruction: "warmer palette" },
        }),
      }),
    );
  });

  it("tryAgain_appendsFeedbackToPromptAndRegenerates", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: "p1",
      originalPrompt: "orig",
      refinedPrompt: "refined prompt",
    });

    await svc.tryAgain("p1", "make it blue");

    const jobArg = prismaMock.job.create.mock.calls[0]?.[0] as {
      data: { type: string; payload: { prompt: string } };
    };
    expect(jobArg.data.type).toBe(JobType.generate);
    expect(jobArg.data.payload.prompt).toContain("refined prompt");
    expect(jobArg.data.payload.prompt).toContain("make it blue");
    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProjectStatus.generating }) }),
    );
  });

  it("claudeDone_marksCompleteAndEnqueuesNothing", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1" });

    await svc.claudeDone("p1");

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProjectStatus.complete }) }),
    );
    expect(prismaMock.job.create).not.toHaveBeenCalled();
  });

  it("geminiHappy_movesToClaudeRefiningUsingSelectedImage", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1", selectedImageId: "imgSel" });

    await svc.geminiHappy("p1");

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ProjectStatus.claude_refining }) }),
    );
    expect(prismaMock.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: JobType.claude_refine,
          payload: expect.objectContaining({ sourceImageId: "imgSel", userInstructions: "" }),
        }),
      }),
    );
  });

  it("geminiHappy_withoutSelectedImage_throws", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "p1", selectedImageId: null });
    await expect(svc.geminiHappy("p1")).rejects.toThrow(/no selected image/i);
  });
});
