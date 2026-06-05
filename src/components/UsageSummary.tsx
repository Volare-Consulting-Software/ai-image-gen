import type { Image } from "@/generated/prisma/client";

import { ClaudeMark, GeminiMark } from "@/components/ProviderIcons";
import { MoneyIcon, TokenIcon } from "@/components/UsageIcons";

function fmtCost(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`;
}

function Stats({ tokens, cost }: { tokens: number; cost: number }) {
  return (
    <>
      {tokens > 0 && (
        <span className="inline-flex items-center gap-0.5 text-text-muted">
          <TokenIcon />
          {tokens.toLocaleString()}
        </span>
      )}
      {cost > 0 && (
        <span className="inline-flex items-center gap-0.5 text-text-muted">
          <MoneyIcon />
          {fmtCost(cost)}
        </span>
      )}
    </>
  );
}

// Per-provider cost/token totals (regardless of model), with a subtle
// expandable per-model breakdown for the curious.
export function UsageSummary({ images }: { images: Image[] }) {
  const provider = {
    gemini: { tokens: 0, cost: 0 },
    claude: { tokens: 0, cost: 0 },
  };
  const perModel = new Map<string, { engine: "gemini" | "claude"; tokens: number; cost: number }>();

  for (const img of images) {
    const engine = img.engine === "claude" ? "claude" : "gemini";
    const tokens = (img.inputTokens ?? 0) + (img.outputTokens ?? 0);
    const cost = img.costUsd ?? 0;
    provider[engine].tokens += tokens;
    provider[engine].cost += cost;
    if (img.model) {
      const e = perModel.get(img.model) ?? { engine, tokens: 0, cost: 0 };
      e.tokens += tokens;
      e.cost += cost;
      perModel.set(img.model, e);
    }
  }

  const providerRows = (["gemini", "claude"] as const)
    .map((key) => ({ key, ...provider[key] }))
    .filter((r) => r.tokens > 0 || r.cost > 0);
  if (providerRows.length === 0) return null;

  return (
    <details className="group text-xs">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
        {providerRows.map((r) => (
          <span
            key={r.key}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 text-text-secondary"
          >
            {r.key === "gemini" ? <GeminiMark /> : <ClaudeMark />}
            <span className="font-semibold">{r.key === "gemini" ? "Gemini" : "Claude"}</span>
            <Stats tokens={r.tokens} cost={r.cost} />
          </span>
        ))}
        <span className="text-text-muted group-open:hidden">by model ▸</span>
        <span className="hidden text-text-muted group-open:inline">by model ▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1 pl-1">
        {[...perModel.entries()].map(([model, m]) => (
          <div key={model} className="flex flex-wrap items-center gap-2 text-text-secondary">
            {m.engine === "gemini" ? <GeminiMark /> : <ClaudeMark />}
            <span className="font-medium">{model}</span>
            <Stats tokens={m.tokens} cost={m.cost} />
          </div>
        ))}
      </div>
    </details>
  );
}
