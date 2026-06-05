import type { Image, Project } from "@/generated/prisma/client";

import { ClaudeMark, GeminiMark } from "@/components/ProviderIcons";
import { MoneyIcon, TokenIcon } from "@/components/UsageIcons";

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-3.5 w-3.5 text-accent" fill="currentColor" aria-label="AI-refined">
      <path d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16l-1.8-4.9L5 9.3l5.2-1.8L12 2z" />
    </svg>
  );
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
  const tokens = (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
  const cost = fmtCost(s.costUsd);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
      <span className="inline-flex items-center gap-1">
        {isGemini ? <GeminiMark /> : <ClaudeMark />}
        {isGemini ? "Gemini" : "Claude"}
        {s.model ? ` · ${s.model}` : ""}
      </span>
      {tokens > 0 && (
        <span className="inline-flex items-center gap-0.5 font-normal text-text-muted">
          <TokenIcon className="h-2.5 w-2.5" />
          {tokens.toLocaleString()}
        </span>
      )}
      {cost && (
        <span className="inline-flex items-center gap-0.5 font-normal text-text-muted">
          <MoneyIcon className="h-2.5 w-2.5" />
          {cost}
        </span>
      )}
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

interface StepEntry {
  key: string;
  label: string;
  text: string;
  source: Source;
}

export function PromptHistory({ project, images }: { project: Project; images: Image[] }) {
  const isRefined = Boolean(
    project.refinedPrompt && project.refinedPrompt !== project.originalPrompt,
  );
  // The prompt went to Gemini, which generated the candidates — so tag the prompt
  // with Gemini and the (summed) generation usage rather than a separate entry.
  const candidates = images.filter((i) => i.stage === "candidate");
  const sum = (f: (i: Image) => number | null) => candidates.reduce((s, i) => s + (f(i) ?? 0), 0);
  const genSource: Source = {
    system: "gemini",
    model: candidates.find((i) => i.model)?.model ?? process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image",
    inputTokens: sum((i) => i.inputTokens),
    outputTokens: sum((i) => i.outputTokens),
    costUsd: sum((i) => i.costUsd),
  };

  const stepEntries: StepEntry[] = images
    .filter((i) => i.stage !== "candidate")
    .map((img) => {
      const isStyle = img.stage === "gemini_refine";
      return {
        key: img.id,
        label: `#${img.roundIndex + 1} · ${isStyle ? "Style edit" : "Polish"}`,
        text: img.promptOrInstruction.trim() || (isStyle ? "(no instruction)" : "Automatic clean-up"),
        source: {
          system: img.engine === "claude" ? "claude" : "gemini",
          model: img.model,
          inputTokens: img.inputTokens,
          outputTokens: img.outputTokens,
          costUsd: img.costUsd,
        },
      };
    });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      {isRefined ? (
        <>
          <Entry label="Original prompt" text={project.originalPrompt} source={{ system: "you" }} />
          <Entry label="Refined prompt" text={project.refinedPrompt as string} source={genSource} ai />
        </>
      ) : (
        <Entry label="Prompt" text={project.refinedPrompt ?? project.originalPrompt} source={genSource} />
      )}

      {stepEntries.map((e) => (
        <Entry key={e.key} label={e.label} text={e.text} source={e.source} />
      ))}
    </div>
  );
}
