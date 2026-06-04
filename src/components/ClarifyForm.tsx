"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
    <div className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">
        A few quick questions — these significantly change the result. Skip any that don&apos;t matter.
      </p>
      {questions.map((q, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{q.question}</label>
          <p className="text-xs text-zinc-500">{q.why}</p>
          <input
            type="text"
            list={q.options && q.options.length > 0 ? `opts-${i}` : undefined}
            value={answers[i] ?? ""}
            onChange={(e) => setAnswer(i, e.target.value)}
            placeholder={q.options?.join(" · ") ?? "Your answer"}
            className="rounded-md border border-zinc-300 bg-white p-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
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
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Generating…" : "Generate images"}
        </button>
      </div>
    </div>
  );
}
