import { FREQUENCIES } from "@/lib/constants";

export function frequencyMultiplier(frequencyId: string): number {
  return FREQUENCIES.find((f) => f.id === frequencyId)?.multiplier ?? 1;
}

export type TransactionLike = {
  amount: number;
  frequency: string;
  category: string;
};

/** Aggregate a list of transactions into a monthly total per category. */
export function aggregateMonthlyByCategory(
  list: TransactionLike[],
): Array<{ category: string; total: number }> {
  const map = new Map<string, number>();
  for (const item of list) {
    const monthly = item.amount * frequencyMultiplier(item.frequency);
    map.set(item.category, (map.get(item.category) ?? 0) + monthly);
  }
  return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
}
