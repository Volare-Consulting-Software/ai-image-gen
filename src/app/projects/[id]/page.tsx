import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectDetail } from "@/logic/projectQueries";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectPoller } from "@/components/ProjectPoller";
import { ClarifyForm } from "@/components/ClarifyForm";
import { CandidatePicker } from "@/components/CandidatePicker";
import { RefineLoopPanel } from "@/components/RefineLoopPanel";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import type { ClarifyingQuestion } from "@/types/clarification";

export const dynamic = "force-dynamic";

const WORKING_LABEL: Record<string, string> = {
  clarify: "Reviewing your prompt…",
  generate: "Generating 3 options with Gemini…",
  gemini_edit: "Applying your changes with Gemini…",
  claude_refine: "Refining with Claude…",
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
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← All projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-zinc-500">{project.refinedPrompt ?? project.originalPrompt}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0">
          {working ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {WORKING_LABEL[activeJob?.type ?? ""] ?? "Working…"}
              </span>
            </div>
          ) : project.status === "error" ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              Something went wrong on the last step. Check the server logs, then create a new project.
            </div>
          ) : project.status === "complete" && project.selectedImageId ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-green-300 bg-white dark:border-green-900 dark:bg-zinc-900">
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
                className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
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
            <CandidatePicker
              projectId={project.id}
              candidateIds={(pendingGate.options as unknown as { imageId: string }[]).map(
                (o) => o.imageId,
              )}
            />
          ) : pendingGate?.kind === "gemini_refine" && project.selectedImageId ? (
            <RefineLoopPanel projectId={project.id} imageId={project.selectedImageId} variant="gemini" />
          ) : pendingGate?.kind === "claude_refine" && project.selectedImageId ? (
            <RefineLoopPanel projectId={project.id} imageId={project.selectedImageId} variant="claude" />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Nothing to do right now.
            </div>
          )}
        </section>

        <aside className="lg:border-l lg:border-zinc-200 lg:pl-6 dark:lg:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">History</h2>
          <HistoryTimeline images={images} selectedImageId={project.selectedImageId} />
        </aside>
      </div>
    </div>
  );
}
