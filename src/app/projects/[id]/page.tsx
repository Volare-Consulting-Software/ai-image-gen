import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getProjectDetail } from "@/logic/projectQueries";
import { getHandoffForProject } from "@/logic/handoffRegistry";
import { buildHandoffBrief } from "@/logic/handoffBrief";
import { baseUrlFromHeaders } from "@/lib/requestUrl";
import { HandoffBrief } from "@/components/HandoffBrief";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectPoller } from "@/components/ProjectPoller";
import { ClarifyForm } from "@/components/ClarifyForm";
import { CandidatePicker } from "@/components/CandidatePicker";
import { RefineLoopPanel } from "@/components/RefineLoopPanel";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { PromptHistory } from "@/components/PromptHistory";
import { DownloadControl } from "@/components/DownloadControl";
import { PickUpButton } from "@/components/PickUpButton";
import { UsageSummary } from "@/components/UsageSummary";
import type { ClarifyingQuestion } from "@/types/clarification";

export const dynamic = "force-dynamic";

const WORKING_LABEL: Record<string, string> = {
  clarify: "Reviewing your prompt…",
  generate: "Generating options…",
  gemini_edit: "Applying your changes…",
  claude_refine: "Refining…",
};

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ image?: string }>;
}) {
  const { id } = await params;
  const { image: previewId } = await searchParams;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const { project, pendingGate, images, activeJob } = detail;
  const working = Boolean(activeJob);

  // Previewing an earlier image in the main area (clicked from the history).
  const previewImage = previewId ? images.find((img) => img.id === previewId) : undefined;
  const previewingOther = previewImage && previewImage.id !== project.selectedImageId;

  // If a polish step is handed off, build the paste-ready brief for this project.
  const handoff = getHandoffForProject(project.id);
  let handoffBrief = "";
  let handoffSourceUrl = "";
  if (handoff) {
    const base = baseUrlFromHeaders(await headers());
    handoffBrief = buildHandoffBrief(handoff, base);
    handoffSourceUrl = `${base}/api/handoff/${handoff.id}/source`;
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectPoller active={working} />

      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
          ← All projects
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-extrabold tracking-tight">{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-text-secondary">{project.refinedPrompt ?? project.originalPrompt}</p>
        <UsageSummary images={images} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0">
          {previewingOther && previewImage ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">Viewing an earlier image</span>
                <Link
                  href={`/projects/${project.id}`}
                  scroll={false}
                  className="text-sm text-text-secondary hover:text-text-primary hover:underline"
                >
                  Back to current step →
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images/${previewImage.id}`}
                  alt="preview"
                  className="mx-auto max-h-[32rem] w-auto object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <span className="text-sm text-text-secondary">Continue the project from this image instead?</span>
                <PickUpButton projectId={project.id} imageId={previewImage.id} />
              </div>
            </div>
          ) : working && handoff ? (
            <HandoffBrief brief={handoffBrief} sourceUrl={handoffSourceUrl} />
          ) : working ? (
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
            (() => {
              const finalImage = images.find((img) => img.id === project.selectedImageId);
              return (
                <div className="flex flex-col gap-3">
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/images/${project.selectedImageId}`}
                      alt="final"
                      className="mx-auto max-h-[32rem] w-auto object-contain"
                    />
                  </div>
                  <DownloadControl
                    imageId={project.selectedImageId}
                    shapeAvailable={finalImage?.shapeAvailable ?? false}
                    transparentBgAvailable={finalImage?.transparentBgAvailable ?? false}
                  />
                </div>
              );
            })()
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
            previewId={previewId}
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
