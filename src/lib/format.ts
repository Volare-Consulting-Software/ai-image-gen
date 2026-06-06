// Format a USD cost with extra precision for sub-cent amounts (AI calls are
// often fractions of a cent).
export function formatCostUsd(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`;
}
