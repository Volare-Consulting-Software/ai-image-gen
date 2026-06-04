"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
    <div className="flex flex-col gap-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. a minimalist logo of a paper airplane for a travel startup"
        rows={3}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || prompt.trim().length < 3}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </div>
  );
}
