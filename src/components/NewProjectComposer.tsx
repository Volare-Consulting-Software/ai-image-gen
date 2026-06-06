"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { PromptEditor, type PromptEditorHandle } from "@/components/ui/PromptEditor";
import { ReferenceImageField } from "@/components/ui/ReferenceImageField";

export function NewProjectComposer() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editorRef = useRef<PromptEditorHandle>(null);
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...(referenceImageId && editorRef.current?.hasChip() ? { referenceImageId } : {}),
        }),
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
      <PromptEditor
        ref={editorRef}
        value={prompt}
        onChange={setPrompt}
        placeholder="e.g. a minimalist logo of a paper airplane for a travel startup"
        rows={3}
        disabled={pending}
      />
      <ReferenceImageField
        editorRef={editorRef}
        onReferenceChange={setReferenceImageId}
        disabled={pending}
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
