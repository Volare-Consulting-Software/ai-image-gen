"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Resume a project from an earlier image when a later path went the wrong way.
export function PickUpButton({ projectId, imageId }: { projectId: string; imageId: string }) {
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

  return (
    <button
      type="button"
      disabled={pending}
      onClick={pickUp}
      className="text-xs font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Pick up from here"}
    </button>
  );
}
