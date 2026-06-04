import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectDetail } from "@/logic/projectQueries";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectPoller } from "@/components/ProjectPoller";
import { ClarifyForm } from "@/components/ClarifyForm";
import { CandidatePicker } from "@/components/CandidatePicker";
import { RefineLoopPanel } from "@/components/RefineLoopPanel";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { PromptHistory } from "@/components/PromptHistory";
import type { ClarifyingQuestion } from "@/types/clarification";

export const dynamic = "force-dynamic";

const WORKING_LABEL: Record<string, string> = {
  clarify: "Reviewing your prompt…",
  generate: "Generating options…",
  gemini_edit: "Applying your changes…",
  claude_refine: "Refining…",
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const { project, pendingGate, images, activeJob } = detail;
  const working = Boolean(activeJob);

  return (
    <div className="flex flex-col gap-6">
      <ProjectPoller active={working} />

      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
          ← All projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight">{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-text-secondary">{project.refinedPrompt ?? project.originalPrompt}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0">
          {working ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-6">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-sm text-text-secondary">
                {WORKING_LABEL[activeJob?.type ?? ""] ?? "Working…"}
              </span>
            </div>
          ) : project.status === "error" ? (
            <div className="rounded-xl border border-[var(--error)] bg-surface p-6 text-sm text-error">
              Something went wrong on the last step. Check the logs, then start a new project.
            </div>
          ) : project.status === "complete" && project.selectedImageId ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images/${project.selectedImageId}`}
                  alt="final"
                  className="mx-auto max-h-[32rem] w-auto object-contain"
                />
              </div>
              <a
                href={`/api/images/${project.selectedImageId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
              >
                Download final image
              </a>
            </div>
          ) : pendingGate?.kind === "clarify" ? (
            <ClarifyForm
              projectId={project.id}
              questions={pendingGate.options as unknown as ClarifyingQuestion[]}
            />
          ) : pendingGate?.kind === "choose" ? (
            (() => {
              const candidateIds = (pendingGate.options as unknown as { imageId: string }[]).map(
                (o) => o.imageId,
              );
              const priorImages = images
                .filter((img) => !candidateIds.includes(img.id))
                .map((img) => ({ id: img.id, label: `#${img.roundIndex + 1} ${img.stage}` }));
              return (
                <CandidatePicker
                  projectId={project.id}
                  candidateIds={candidateIds}
                  priorImages={priorImages}
                />
              );
            })()
          ) : pendingGate?.kind === "gemini_refine" && project.selectedImageId ? (
            <RefineLoopPanel projectId={project.id} imageId={project.selectedImageId} variant="style" />
          ) : pendingGate?.kind === "claude_refine" && project.selectedImageId ? (
            <RefineLoopPanel projectId={project.id} imageId={project.selectedImageId} variant="polish" />
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
              Nothing to do right now.
            </div>
          )}
        </section>

        <aside className="lg:border-l lg:border-border lg:pl-6">
          <h2 className="mb-3 text-sm font-bold tracking-tight">Images</h2>
          <HistoryTimeline
            projectId={project.id}
            images={images}
            selectedImageId={project.selectedImageId}
          />
        </aside>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Prompt history</h2>
        <PromptHistory project={project} images={images} />
      </section>
    </div>
  );
}
