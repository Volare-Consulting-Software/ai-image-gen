import { GateStatus, JobStatus } from "@/generated/prisma/enums";
import type { Gate, Image, Job, Project } from "@/generated/prisma/client";
import { prisma } from "@/db/client";

export interface ProjectListItem {
  project: Project;
  imageCount: number;
}

export interface ProjectDetail {
  project: Project;
  pendingGate: Gate | null;
  images: Image[];
  activeJob: Job | null;
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { images: true } } },
  });
  return projects.map((p) => ({ project: p, imageCount: p._count.images }));
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const [pendingGate, images, activeJob] = await Promise.all([
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
  ]);

  return { project, pendingGate, images, activeJob };
}
