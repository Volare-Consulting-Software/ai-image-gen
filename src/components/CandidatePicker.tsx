"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function CandidatePicker({
  projectId,
  candidateIds,
}: {
  projectId: string;
  candidateIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {candidateIds.map((id) => {
          const isSel = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`overflow-hidden rounded-lg border-2 transition-colors ${
                isSel ? "border-zinc-900 dark:border-zinc-100" : "border-transparent hover:border-zinc-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/images/${id}`} alt="candidate" className="aspect-square w-full object-cover" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {selected ? (
          <>
            <p className="text-sm text-zinc-500">What next with the selected image?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => post({ action: "as_is", imageId: selected })}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Use as-is → refine with Claude
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setMode(mode === "suggest" ? "none" : "suggest")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Select with suggestions
              </button>
            </div>
            {mode === "suggest" && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={2}
                  placeholder="e.g. make the background warmer and add a subtle gradient"
                  className="w-full resize-y rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <div>
                  <button
                    type="button"
                    disabled={pending || suggestions.trim().length === 0}
                    onClick={() => post({ action: "with_suggestions", imageId: selected, suggestions })}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    Send to Gemini
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Select an image above, or try again below.</p>
        )}

        <hr className="border-zinc-200 dark:border-zinc-800" />
        <button
          type="button"
          disabled={pending}
          onClick={() => setMode(mode === "again" ? "none" : "again")}
          className="self-start text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
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
              className="w-full resize-y rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div>
              <button
                type="button"
                disabled={pending}
                onClick={() => post({ action: "try_again", feedback: feedback.trim() || undefined })}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
