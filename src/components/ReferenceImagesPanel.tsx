import type { ReferenceImage } from "@/generated/prisma/client";

// A dedicated sidebar section showing the user-uploaded reference photo(s) that
// guided this project's image generation. Rendered above the Images timeline so
// it's obvious a reference was used.
export function ReferenceImagesPanel({ referenceImages }: { referenceImages: ReferenceImage[] }) {
  if (referenceImages.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-bold tracking-tight">Reference images</h2>
      <div className="flex flex-wrap gap-2">
        {referenceImages.map((ref) => (
          <a
            key={ref.id}
            href={`/api/reference-images/${ref.id}`}
            target="_blank"
            rel="noreferrer"
            title="Open reference image"
            className="overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/reference-images/${ref.id}`}
              alt="reference"
              className="h-20 w-20 object-cover transition-opacity hover:opacity-80"
            />
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted">Guided the generated images.</p>
    </div>
  );
}
