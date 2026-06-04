"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

export function CandidatePicker({
  projectId,
  candidateIds,
  priorImages = [],
}: {
  projectId: string;
  candidateIds: string[];
  // Earlier images in the project, shown as read-only context while choosing.
  priorImages?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(
    candidateIds.length === 1 ? (candidateIds[0] ?? null) : null,
  );
  const [suggestions, setSuggestions] = useState("");
  const [feedback, setFeedback] = useState("");
  const [mode, setMode] = useState<"none" | "suggest" | "again">("none");
  const [pending, startTransition] = useTransition();

  function post(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`grid grid-cols-1 gap-4 ${candidateIds.length > 1 ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}
      >
        {candidateIds.map((id) => {
          const isSel = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`overflow-hidden rounded-xl border-2 transition-colors ${
                isSel ? "border-accent" : "border-transparent hover:border-border-strong"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/images/${id}`} alt="option" className="aspect-square w-full object-cover" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        {selected ? (
          <>
            <p className="text-sm text-text-secondary">What next with the selected image?</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => post({ action: "as_is", imageId: selected })}>
                Use as-is
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setMode(mode === "suggest" ? "none" : "suggest")}
              >
                Refine with suggestions
              </Button>
            </div>
            {mode === "suggest" && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={2}
                  placeholder="e.g. make the background warmer and add a subtle gradient"
                  className="w-full resize-y rounded-lg border border-border bg-base p-2 text-base outline-none focus:border-accent"
                />
                <div>
                  <Button
                    disabled={pending || suggestions.trim().length === 0}
                    onClick={() => post({ action: "with_suggestions", imageId: selected, suggestions })}
                  >
                    Apply changes
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-text-secondary">Select an image above, or try again below.</p>
        )}

        <hr className="border-border" />
        <button
          type="button"
          disabled={pending}
          onClick={() => setMode(mode === "again" ? "none" : "again")}
          className="self-start text-sm font-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
        >
          None of these — try again
        </button>
        {mode === "again" && (
          <div className="flex flex-col gap-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Optional: what should be different this time?"
              className="w-full resize-y rounded-lg border border-border bg-base p-2 text-base outline-none focus:border-accent"
            />
            <div>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => post({ action: "try_again", feedback: feedback.trim() || undefined })}
              >
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>

      {priorImages.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-text-muted">Considered so far</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {priorImages.map((img) => (
              <a
                key={img.id}
                href={`/api/images/${img.id}`}
                target="_blank"
                rel="noreferrer"
                title={img.label}
                className="overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images/${img.id}`}
                  alt={img.label}
                  className="aspect-square w-full object-cover opacity-80 transition-opacity hover:opacity-100"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
