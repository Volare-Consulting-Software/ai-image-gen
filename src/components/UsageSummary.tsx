import type { Image, Job } from "@/generated/prisma/client";

import { UsageBreakdown, type ProviderStat } from "@/components/UsageBreakdown";

// Aggregate per-provider (and per-model within provider) usage on the server,
// then hand plain data to the interactive breakdown. `failedJobs` covers calls
// that were billed but produced no Image (their usage lives on the Job).
export function UsageSummary({ images, failedJobs = [] }: { images: Image[]; failedJobs?: Job[] }) {
  const acc: Record<"gemini" | "claude", { tokens: number; cost: number; models: Map<string, { tokens: number; cost: number }> }> = {
    gemini: { tokens: 0, cost: 0, models: new Map() },
    claude: { tokens: 0, cost: 0, models: new Map() },
  };

  function add(engine: "gemini" | "claude", model: string | null, inputTokens: number | null, outputTokens: number | null, costUsd: number | null) {
    const tokens = (inputTokens ?? 0) + (outputTokens ?? 0);
    const cost = costUsd ?? 0;
    if (tokens === 0 && cost === 0) return;
    acc[engine].tokens += tokens;
    acc[engine].cost += cost;
    if (model) {
      const m = acc[engine].models.get(model) ?? { tokens: 0, cost: 0 };
      m.tokens += tokens;
      m.cost += cost;
      acc[engine].models.set(model, m);
    }
  }

  for (const img of images) {
    add(img.engine === "claude" ? "claude" : "gemini", img.model, img.inputTokens, img.outputTokens, img.costUsd);
  }
  for (const job of failedJobs) {
    // Infer provider from the recorded model (image/text models are Gemini).
    const engine = job.model?.toLowerCase().includes("claude") ? "claude" : "gemini";
    add(engine, job.model, job.inputTokens, job.outputTokens, job.costUsd);
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
