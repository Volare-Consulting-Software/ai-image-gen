import type { ProjectStatus } from "@/generated/prisma/client";

const NEUTRAL = "bg-surface-sunken text-text-secondary";
const ACTIVE = "bg-accent-dim text-accent-pressed";

const LABELS: Record<ProjectStatus, { label: string; cls: string }> = {
  drafting_prompt: { label: "Drafting", cls: NEUTRAL },
  clarifying: { label: "Clarifying", cls: ACTIVE },
  generating: { label: "Generating", cls: ACTIVE },
  choosing: { label: "Choosing", cls: ACTIVE },
  gemini_refining: { label: "Restyling", cls: ACTIVE },
  claude_refining: { label: "Polishing", cls: ACTIVE },
  complete: { label: "Complete", cls: "bg-[var(--success)] text-white" },
  error: { label: "Error", cls: "bg-[var(--error)] text-white" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, cls } = LABELS[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  );
}
