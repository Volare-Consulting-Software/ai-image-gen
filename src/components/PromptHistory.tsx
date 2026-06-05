import type { Image, Project } from "@/generated/prisma/client";

// Distinct marks for each AI system.
function GeminiMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 text-blue-600" fill="currentColor" aria-label="Gemini">
      <path d="M12 2c.5 4.5 3 7 7.5 7.5C15 10 12.5 12.5 12 17c-.5-4.5-3-7-7.5-7.5C9 9.5 11.5 7 12 2z" />
    </svg>
  );
}

function ClaudeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 text-orange-600"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      aria-label="Claude"
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
      <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-3.5 w-3.5 text-accent" fill="currentColor" aria-label="AI-refined">
      <path d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16l-1.8-4.9L5 9.3l5.2-1.8L12 2z" />
    </svg>
  );
}

function fmtTokens(input?: number | null, output?: number | null): string | null {
  const total = (input ?? 0) + (output ?? 0);
  return total > 0 ? `${total.toLocaleString()} tok` : null;
}

function fmtCost(cost?: number | null): string | null {
  if (cost == null || cost <= 0) return null;
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`;
}

interface Source {
  system: "you" | "gemini" | "claude";
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
}

function SourceBadge({ s }: { s: Source }) {
  if (s.system === "you") {
    return (
      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-text-muted">
        You
      </span>
    );
  }
  const isGemini = s.system === "gemini";
  const usage = [fmtTokens(s.inputTokens, s.outputTokens), fmtCost(s.costUsd)].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
      {isGemini ? <GeminiMark /> : <ClaudeMark />}
      <span>
        {isGemini ? "Gemini" : "Claude"}
        {s.model ? ` · ${s.model}` : ""}
      </span>
      {usage && <span className="font-normal text-text-muted">· {usage}</span>}
    </span>
  );
}

function Entry({ label, text, source, ai = false }: { label: string; text: string; source: Source; ai?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
          {label}
          {ai && <Sparkle />}
        </span>
        <SourceBadge s={source} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-text-secondary">{text}</p>
    </div>
  );
}

export function PromptHistory({ project, images }: { project: Project; images: Image[] }) {
  const steps = images.filter((img) => img.stage !== "candidate");
  const isRefined = Boolean(
    project.refinedPrompt && project.refinedPrompt !== project.originalPrompt,
  );
  const textModel = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      {isRefined ? (
        <>
          <Entry label="Original prompt" text={project.originalPrompt} source={{ system: "you" }} />
          <Entry
            label="Refined prompt"
            text={project.refinedPrompt as string}
            source={{ system: "gemini", model: textModel }}
            ai
          />
        </>
      ) : (
        <Entry
          label="Prompt"
          text={project.refinedPrompt ?? project.originalPrompt}
          source={{ system: "you" }}
        />
      )}

      {steps.map((img) => {
        const isStyle = img.stage === "gemini_refine";
        const text = img.promptOrInstruction.trim() || (isStyle ? "(no instruction)" : "Automatic clean-up");
        return (
          <Entry
            key={img.id}
            label={`#${img.roundIndex + 1} · ${isStyle ? "Style edit" : "Polish"}`}
            text={text}
            source={{
              system: img.engine === "claude" ? "claude" : "gemini",
              model: img.model,
              inputTokens: img.inputTokens,
              outputTokens: img.outputTokens,
              costUsd: img.costUsd,
            }}
          />
        );
      })}
    </div>
  );
}
