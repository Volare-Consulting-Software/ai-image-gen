"use client";

import { useState } from "react";

import { ClaudeMark, GeminiMark } from "@/components/ProviderIcons";
import { MoneyIcon, TokenIcon } from "@/components/UsageIcons";

interface ModelStat {
  model: string;
  tokens: number;
  cost: number;
}

export interface ProviderStat {
  key: "gemini" | "claude";
  label: string;
  tokens: number;
  cost: number;
  models: ModelStat[];
}

function fmtCost(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`;
}

function Stats({ tokens, cost }: { tokens: number; cost: number }) {
  return (
    <>
      {tokens > 0 && (
        <span className="inline-flex items-center gap-0.5 font-normal text-text-muted">
          <TokenIcon className="h-2.5 w-2.5" />
          {tokens.toLocaleString()}
        </span>
      )}
      {cost > 0 && (
        <span className="inline-flex items-center gap-0.5 font-normal text-text-muted">
          <MoneyIcon className="h-2.5 w-2.5" />
          {fmtCost(cost)}
        </span>
      )}
    </>
  );
}

// Per-provider totals (click a provider to expand its per-model breakdown), plus
// a combined total across all providers.
export function UsageBreakdown({
  providers,
  total,
}: {
  providers: ProviderStat[];
  total: { tokens: number; cost: number };
}) {
  const [open, setOpen] = useState<string | null>(null);
  const openProvider = providers.find((p) => p.key === open);

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {providers.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setOpen(open === p.key ? null : p.key)}
            title="Show per-model breakdown"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition-colors ${
              open === p.key
                ? "bg-accent-dim text-accent-pressed"
                : "bg-surface-sunken text-text-secondary hover:bg-accent-dim"
            }`}
          >
            {p.key === "gemini" ? <GeminiMark /> : <ClaudeMark />}
            <span>{p.label}</span>
            <Stats tokens={p.tokens} cost={p.cost} />
          </button>
        ))}
        <span className="inline-flex items-center gap-1.5 font-semibold text-text-secondary">
          <span>Total</span>
          <Stats tokens={total.tokens} cost={total.cost} />
        </span>
      </div>

      {openProvider && (
        <div className="flex flex-col gap-1 pl-1">
          {openProvider.models.length === 0 ? (
            <span className="text-text-muted">No per-model data.</span>
          ) : (
            openProvider.models.map((m) => (
              <div key={m.model} className="flex flex-wrap items-center gap-2 text-text-secondary">
                {openProvider.key === "gemini" ? <GeminiMark /> : <ClaudeMark />}
                <span className="font-medium">{m.model}</span>
                <Stats tokens={m.tokens} cost={m.cost} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
