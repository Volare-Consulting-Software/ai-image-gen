"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

export function NewProjectComposer() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      const { project } = (await res.json()) as { project: { id: string } };
      router.push(`/projects/${project.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. a minimalist logo of a paper airplane for a travel startup"
        rows={3}
        className="w-full resize-y rounded-lg border border-border bg-base p-3 text-base outline-none focus:border-accent"
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <div>
        <Button onClick={submit} disabled={pending || prompt.trim().length < 3}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </div>
  );
}
