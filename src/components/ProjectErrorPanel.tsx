"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { humanizeGeminiReason } from "@/lib/geminiFailure";

// Shown when a project errored: surfaces the failure reason and lets the user
// tweak the prompt and re-run generation in the same project (the attached
// reference, if any, is reused).
export function ProjectErrorPanel({
  projectId,
  initialPrompt,
  lastError,
  failureReason,
}: {
  projectId: string;
  initialPrompt: string;
  lastError: string | null;
  // Structured Gemini reason code when the model declined (vs a system error).
  failureReason: string | null;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--error)] bg-surface p-6">
      {failureReason ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-white">
            AI error
          </span>
          <span className="text-sm text-text-secondary">{humanizeGeminiReason(failureReason)}</span>
        </div>
      ) : (
        <p className="text-sm font-semibold text-error">Something went wrong on the last step.</p>
      )}
      {lastError && (
        <p className="whitespace-pre-wrap text-sm text-text-muted">
          {failureReason ? `The model said: ${lastError}` : lastError}
        </p>
      )}

      <label className="mt-1 text-sm font-semibold">Adjust your prompt and try again</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        className="w-full resize-y rounded-lg border border-border bg-base p-2 text-text-primary outline-none focus:border-accent"
      />
      <div>
        <Button onClick={retry} disabled={pending || prompt.trim().length < 3}>
          {pending ? "Generating…" : "Try again"}
        </Button>
      </div>
    </div>
  );
}
