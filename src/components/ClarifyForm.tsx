"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import type { ClarifyingQuestion } from "@/types/clarification";

export function ClarifyForm({
  projectId,
  questions,
}: {
  projectId: string;
  questions: ClarifyingQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [pending, startTransition] = useTransition();

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function submit() {
    const payload = questions.map((q, i) => ({ question: q.question, answer: answers[i] ?? "" }));
    startTransition(async () => {
      await fetch(`/api/projects/${projectId}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-text-secondary">
        A few quick questions — these significantly change the result. Skip any that don&apos;t matter.
      </p>
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">{q.question}</label>
          <p className="text-xs text-text-muted">{q.why}</p>
          <input
            type="text"
            list={q.options && q.options.length > 0 ? `opts-${i}` : undefined}
            value={answers[i] ?? ""}
            onChange={(e) => setAnswer(i, e.target.value)}
            placeholder={q.options?.join(" · ") ?? "Your answer"}
            className="rounded-lg border border-border bg-base p-2 text-base outline-none focus:border-accent"
          />
          {q.options && q.options.length > 0 && (
            <datalist id={`opts-${i}`}>
              {q.options.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          )}
        </div>
      ))}
      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Generating…" : "Generate images"}
        </Button>
      </div>
    </div>
  );
}
