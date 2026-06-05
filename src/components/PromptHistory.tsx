import type { Image, Project } from "@/generated/prisma/client";

// Small "AI" sparkle mark (inline SVG — brand voice avoids emoji in UI).
function Sparkle() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="AI-refined"
      className="inline h-3.5 w-3.5 text-accent"
      fill="currentColor"
    >
      <path d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16l-1.8-4.9L5 9.3l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17l-2.6.9L19 20.5l-.9-2.6L15.5 17l2.6-.4L19 14z" />
    </svg>
  );
}

function Entry({ label, text, ai = false }: { label: string; text: string; ai?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
        {label}
        {ai && <Sparkle />}
      </span>
      <p className="whitespace-pre-wrap text-sm text-text-secondary">{text}</p>
    </div>
  );
}

// A text log of the prompts/instructions used across the project's journey.
export function PromptHistory({ project, images }: { project: Project; images: Image[] }) {
  const steps = images.filter((img) => img.stage !== "candidate");
  const isRefined = Boolean(
    project.refinedPrompt && project.refinedPrompt !== project.originalPrompt,
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      {isRefined ? (
        <>
          <Entry label="Original prompt" text={project.originalPrompt} />
          <Entry label="Refined prompt" text={project.refinedPrompt as string} ai />
        </>
      ) : (
        // Original and refined are the same (or no refinement) — show just one.
        <Entry label="Prompt" text={project.refinedPrompt ?? project.originalPrompt} />
      )}

      {steps.map((img) => {
        const isStyle = img.stage === "gemini_refine";
        const text = img.promptOrInstruction.trim() || (isStyle ? "(no instruction)" : "Automatic clean-up");
        return (
          <Entry key={img.id} label={`#${img.roundIndex + 1} · ${isStyle ? "Style edit" : "Polish"}`} text={text} />
        );
      })}
    </div>
  );
}
