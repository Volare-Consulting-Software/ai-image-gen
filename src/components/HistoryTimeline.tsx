import Link from "next/link";

import type { Image } from "@/generated/prisma/client";

const STAGE_LABEL: Record<string, string> = {
  candidate: "Option",
  gemini_refine: "Style edit",
  claude_refine: "Polish",
};

// Clicking a row previews that image in the main area (via ?image=). The current
// step is outlined; the row being previewed is highlighted.
export function HistoryTimeline({
  projectId,
  images,
  selectedImageId,
  previewId,
}: {
  projectId: string;
  images: Image[];
  selectedImageId: string | null;
  previewId?: string;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-text-muted">No images yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {images.map((img) => {
        const isCurrent = img.id === selectedImageId;
        const isPreview = img.id === previewId;
        const border = isCurrent
          ? "border-accent"
          : isPreview
            ? "border-border-strong bg-surface-sunken"
            : "border-border hover:bg-surface-sunken";
        const label = STAGE_LABEL[img.stage] ?? img.stage;
        const instruction =
          img.promptOrInstruction.trim() || (img.stage === "claude_refine" ? "Automatic clean-up" : "—");
        return (
          <li key={img.id}>
            <Link
              href={`/projects/${projectId}?image=${img.id}`}
              scroll={false}
              className={`flex gap-3 rounded-lg border p-2 transition-colors ${border}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/images/${img.id}`}
                alt={label}
                className="h-14 w-14 shrink-0 rounded-md object-cover"
              />
              <div className="flex min-w-0 flex-col justify-center gap-0.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  #{img.roundIndex + 1} · {label}
                  {isCurrent && (
                    <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-accent-on">
                      Current
                    </span>
                  )}
                  {img.referenceImageId && (
                    <span
                      title="Generated with a reference image"
                      className="rounded-full bg-accent-dim px-1.5 py-px text-[10px] font-semibold text-accent"
                    >
                      Ref
                    </span>
                  )}
                </span>
                <span className="truncate text-xs text-text-muted" title={instruction}>
                  {instruction}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
