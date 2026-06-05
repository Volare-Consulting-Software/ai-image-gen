import type { Image } from "@/generated/prisma/client";

import { UsageBreakdown, type ProviderStat } from "@/components/UsageBreakdown";

// Aggregate per-provider (and per-model within provider) usage on the server,
// then hand plain data to the interactive breakdown.
export function UsageSummary({ images }: { images: Image[] }) {
  const acc: Record<"gemini" | "claude", { tokens: number; cost: number; models: Map<string, { tokens: number; cost: number }> }> = {
    gemini: { tokens: 0, cost: 0, models: new Map() },
    claude: { tokens: 0, cost: 0, models: new Map() },
  };

  for (const img of images) {
    const engine = img.engine === "claude" ? "claude" : "gemini";
    const tokens = (img.inputTokens ?? 0) + (img.outputTokens ?? 0);
    const cost = img.costUsd ?? 0;
    acc[engine].tokens += tokens;
    acc[engine].cost += cost;
    if (img.model) {
      const m = acc[engine].models.get(img.model) ?? { tokens: 0, cost: 0 };
      m.tokens += tokens;
      m.cost += cost;
      acc[engine].models.set(img.model, m);
    }
  }

  const providers: ProviderStat[] = (["gemini", "claude"] as const)
    .map((key) => ({
      key,
      label: key === "gemini" ? "Gemini" : "Claude",
      tokens: acc[key].tokens,
      cost: acc[key].cost,
      models: [...acc[key].models.entries()].map(([model, v]) => ({ model, ...v })),
    }))
    .filter((p) => p.tokens > 0 || p.cost > 0);

  if (providers.length === 0) return null;

  const total = {
    tokens: providers.reduce((s, p) => s + p.tokens, 0),
    cost: providers.reduce((s, p) => s + p.cost, 0),
  };

  return <UsageBreakdown providers={providers} total={total} />;
}
