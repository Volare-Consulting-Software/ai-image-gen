"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

// Technical quick-actions for the polish stage — these map to deterministic
// image operations (format, scale, layering, transparency) the refiner runs.
const POLISH_PRESETS = [
  "Make the background transparent",
  "Upscale 2× and keep it crisp",
  "Convert to PNG",
  "Convert to JPEG",
  "Sharpen the edges, lines and shapes",
];

// Drives both refinement loops:
//  - variant "style": advance to polishing, or send more style/content changes
//  - variant "polish": finish, or apply more technical refinements
export function RefineLoopPanel({
  projectId,
  imageId,
  variant,
  initialText = "",
}: {
  projectId: string;
  imageId: string;
  variant: "style" | "polish";
  initialText?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [open, setOpen] = useState(initialText.trim().length > 0);
  const [pending, startTransition] = useTransition();

  const advanceAction = variant === "style" ? "happy" : "done";
  const moreAction = variant === "style" ? "more" : "refine";
  const advanceLabel = variant === "style" ? "Looks good — polish it" : "Done — finish project";
  const moreLabel = variant === "style" ? "Suggest changes" : "Refine details";
  const placeholder =
    variant === "style"
      ? "e.g. cooler palette, move the subject left, simpler background"
      : "e.g. sharpen the edges, boost contrast, clean up the curve on the left";

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
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/images/${imageId}`} alt="current" className="mx-auto max-h-[28rem] w-auto object-contain" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => post({ action: advanceAction })}>
            {advanceLabel}
          </Button>
          {variant === "style" && (
            <Button variant="secondary" disabled={pending} onClick={() => post({ action: "finish" })}>
              Use as-is (finish)
            </Button>
          )}
          <Button variant="secondary" disabled={pending} onClick={() => setOpen((v) => !v)}>
            {moreLabel}
          </Button>
        </div>

        {variant === "polish" && (
          <div className="flex flex-wrap gap-2">
            {POLISH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={pending}
                onClick={() => {
                  setText(preset);
                  setOpen(true);
                }}
                className="rounded-full border border-border bg-base px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {open && (
          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={placeholder}
              className="w-full resize-y rounded-lg border border-border bg-base p-2 text-base outline-none focus:border-accent"
            />
            <div>
              <Button
                disabled={pending || text.trim().length === 0}
                onClick={() => post({ action: moreAction, suggestions: text })}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
