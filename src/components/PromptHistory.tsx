import type { Image, Project } from "@/generated/prisma/client";

function Entry({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      <p className="whitespace-pre-wrap text-sm text-text-secondary">{text}</p>
    </div>
  );
}

// A text log of the prompts/instructions used across the project's journey:
// the original idea, the synthesized prompt, then each style/polish instruction.
export function PromptHistory({ project, images }: { project: Project; images: Image[] }) {
  const steps = images.filter((img) => img.stage !== "candidate");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <Entry label="Original prompt" text={project.originalPrompt} />
      {project.refinedPrompt && <Entry label="Refined prompt" text={project.refinedPrompt} />}
      {steps.map((img) => (
        <Entry
          key={img.id}
          label={`#${img.roundIndex + 1} · ${img.stage === "gemini_refine" ? "Style edit" : "Polish"}`}
          text={img.promptOrInstruction}
        />
      ))}
    </div>
  );
}
