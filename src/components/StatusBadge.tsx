import type { ProjectStatus } from "@/generated/prisma/client";

const LABELS: Record<ProjectStatus, { label: string; cls: string }> = {
  drafting_prompt: { label: "Drafting", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  clarifying: { label: "Clarifying", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  generating: { label: "Generating", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  choosing: { label: "Choosing", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  gemini_refining: { label: "Gemini refine", cls: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  claude_refining: { label: "Claude refine", cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  complete: { label: "Complete", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  error: { label: "Error", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, cls } = LABELS[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}
