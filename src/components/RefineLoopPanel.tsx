"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// Drives both refinement loops:
//  - variant "gemini": advance ("happy") or send more style changes ("more")
//  - variant "claude": finish ("done") or refine further ("refine")
export function RefineLoopPanel({
  projectId,
  imageId,
  variant,
}: {
  projectId: string;
  imageId: string;
  variant: "gemini" | "claude";
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const advanceAction = variant === "gemini" ? "happy" : "done";
  const moreAction = variant === "gemini" ? "more" : "refine";
  const advanceLabel =
    variant === "gemini" ? "Happy with it → refine with Claude" : "Done — finish project";
  const moreLabel = variant === "gemini" ? "Send more changes to Gemini" : "Refine further with Claude";
  const placeholder =
    variant === "gemini"
      ? "e.g. cooler palette, move the subject left, simpler background"
      : "e.g. sharpen the edges more, boost contrast, clean up the curve on the left";

  function post(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/images/${imageId}`} alt="current" className="mx-auto max-h-[28rem] w-auto object-contain" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => post({ action: advanceAction })}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {advanceLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {moreLabel}
          </button>
        </div>
        {open && (
          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={placeholder}
              className="w-full resize-y rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div>
              <button
                type="button"
                disabled={pending || text.trim().length === 0}
                onClick={() => post({ action: moreAction, suggestions: text })}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
