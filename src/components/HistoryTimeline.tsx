import type { Image } from "@/generated/prisma/client";

const STAGE_LABEL: Record<string, string> = {
  candidate: "Candidate",
  gemini_refine: "Gemini edit",
  claude_refine: "Claude refine",
};

export function HistoryTimeline({
  images,
  selectedImageId,
}: {
  images: Image[];
  selectedImageId: string | null;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-zinc-500">No images yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {images.map((img) => (
        <li
          key={img.id}
          className={`flex gap-3 rounded-lg border p-2 ${
            img.id === selectedImageId
              ? "border-zinc-900 dark:border-zinc-100"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <a href={`/api/images/${img.id}`} target="_blank" rel="noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${img.id}`}
              alt={STAGE_LABEL[img.stage] ?? img.stage}
              className="h-14 w-14 rounded object-cover"
            />
          </a>
          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-xs font-medium">
              #{img.roundIndex + 1} · {STAGE_LABEL[img.stage] ?? img.stage}
            </span>
            <span className="truncate text-xs text-zinc-500" title={img.promptOrInstruction}>
              {img.promptOrInstruction}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
