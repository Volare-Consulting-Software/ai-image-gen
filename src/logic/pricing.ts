// Best-effort cost estimation from token counts. Rates are USD per 1M tokens and
// approximate — for exact spend, providers that report cost directly (e.g. the
// Claude Agent SDK's total_cost_usd) are preferred over this estimate.
interface Rate {
  input: number;
  output: number;
}

function rateFor(model: string): Rate | undefined {
  const m = model.toLowerCase();
  if (m.includes("image")) return { input: 0.3, output: 30 }; // nano-banana image models
  if (m.includes("gemini")) return { input: 0.15, output: 0.6 }; // gemini flash text
  if (m.includes("opus")) return { input: 15, output: 75 };
  if (m.includes("sonnet")) return { input: 3, output: 15 };
  if (m.includes("haiku")) return { input: 1, output: 5 };
  return undefined;
}

export function estimateCostUsd(
  model: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | undefined {
  if (!model) return undefined;
  const rate = rateFor(model);
  if (!rate) return undefined;
  return ((inputTokens ?? 0) * rate.input + (outputTokens ?? 0) * rate.output) / 1_000_000;
}
