"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Resume a project from a given image — used both to pick up an earlier image
// when a later path went the wrong way, and to reopen a completed project to
// keep refining. `pickUpFrom` re-enters the loop matching the image's stage.
export function PickUpButton({
  projectId,
  imageId,
  label = "Pick up from here",
  variant = "link",
}: {
  projectId: string;
  imageId: string;
  label?: string;
  variant?: "link" | "button";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pickUp() {
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      router.refresh();
    });
  }

  const cls =
    variant === "button"
      ? "inline-flex items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-dim disabled:opacity-50"
      : "text-xs font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50";

  return (
    <button type="button" disabled={pending} onClick={pickUp} className={cls}>
      {pending ? "…" : label}
    </button>
  );
}
