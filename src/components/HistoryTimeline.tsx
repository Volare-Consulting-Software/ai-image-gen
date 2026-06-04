import type { Image } from "@/generated/prisma/client";

const STAGE_LABEL: Record<string, string> = {
  candidate: "Option",
  gemini_refine: "Style edit",
  claude_refine: "Polish",
};

export function HistoryTimeline({
  images,
  selectedImageId,
}: {
  images: Image[];
  selectedImageId: string | null;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-text-muted">No images yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {images.map((img) => (
        <li
          key={img.id}
          className={`flex gap-3 rounded-lg border p-2 ${
            img.id === selectedImageId ? "border-accent" : "border-border"
          }`}
        >
          <a href={`/api/images/${img.id}`} target="_blank" rel="noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${img.id}`}
              alt={STAGE_LABEL[img.stage] ?? img.stage}
              className="h-14 w-14 rounded-md object-cover"
            />
          </a>
          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-xs font-semibold">
              #{img.roundIndex + 1} · {STAGE_LABEL[img.stage] ?? img.stage}
            </span>
            <span className="truncate text-xs text-text-muted" title={img.promptOrInstruction}>
              {img.promptOrInstruction}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
