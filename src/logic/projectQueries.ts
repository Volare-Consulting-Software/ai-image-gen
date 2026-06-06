import { GateStatus, JobStatus } from "@/generated/prisma/enums";
import type { Gate, Image, Job, Project, ReferenceImage } from "@/generated/prisma/client";
import { prisma } from "@/db/client";

export interface ProjectListItem {
  project: Project;
  imageCount: number;
  // A few recent image ids for a montage preview on the gallery card.
  recentImageIds: string[];
  // Total spend across the project's images plus any billed-but-failed jobs.
  totalCostUsd: number;
}

export interface ProjectDetail {
  project: Project;
  pendingGate: Gate | null;
  images: Image[];
  activeJob: Job | null;
  // The reference photos that actually influenced this project's images.
  referenceImages: ReferenceImage[];
  // The message from the most recent failed job, shown when the project errored.
  lastError: string | null;
  // Structured Gemini reason code for the most recent AI failure, if any.
  lastFailureReason: string | null;
  // Errored jobs (used to surface usage that wasn't attributed to an Image).
  failedJobs: Job[];
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { images: true } },
      // Newest first; up to 9 for a 3×3 montage.
      images: { select: { id: true }, orderBy: { createdAt: "desc" }, take: 9 },
    },
  });
  // Sum cost per project from images and billed-but-failed jobs in two grouped
  // queries (rather than N per-project aggregates).
  const ids = projects.map((p) => p.id);
  const cost = new Map<string, number>();
  if (ids.length > 0) {
    const [imageCosts, jobCosts] = await Promise.all([
      prisma.image.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids } },
        _sum: { costUsd: true },
      }),
      prisma.job.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids }, status: JobStatus.error },
        _sum: { costUsd: true },
      }),
    ]);
    for (const row of [...imageCosts, ...jobCosts]) {
      cost.set(row.projectId, (cost.get(row.projectId) ?? 0) + (row._sum.costUsd ?? 0));
    }
  }

  return projects.map((p) => ({
    project: p,
    imageCount: p._count.images,
    recentImageIds: p.images.map((img) => img.id),
    totalCostUsd: cost.get(p.id) ?? 0,
  }));
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const [pendingGate, images, activeJob, erroredJobs] = await Promise.all([
    prisma.gate.findFirst({
      where: { projectId, status: GateStatus.pending },
      orderBy: { createdAt: "desc" },
    }),
    prisma.image.findMany({
      where: { projectId },
      orderBy: [{ roundIndex: "asc" }, { createdAt: "asc" }],
    }),
    prisma.job.findFirst({
      where: { projectId, status: { in: [JobStatus.queued, JobStatus.running] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({
      where: { projectId, status: JobStatus.error },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Distinct references for this project: the one attached at creation (used by
  // candidate generation) plus any recorded per-image (style edits).
  const referenceImageIds = [
    ...new Set(
      [project.referenceImageId, ...images.map((img) => img.referenceImageId)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const referenceImages = referenceImageIds.length
    ? await prisma.referenceImage.findMany({
        where: { id: { in: referenceImageIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return {
    project,
    pendingGate,
    images,
    activeJob,
    referenceImages,
    lastError: erroredJobs[0]?.error ?? null,
    lastFailureReason: erroredJobs[0]?.failureReason ?? null,
    // Errored jobs that still consumed tokens (no resulting Image to carry it).
    failedJobs: erroredJobs,
  };
}
