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

/**
 * Phase 3.1.1 — separate fixed (recurring) from variable (one_time
 * within the current calendar month) expenses so the dashboard and
 * coach show a coherent monthly total.
 *
 * Why these two buckets specifically:
 *   - Fixed = recurring lines that the user pays every period; the
 *     existing `frequencyMultiplier` already normalises them to a
 *     comparable monthly figure (monthly = 1, weekly ≈ 4.33,
 *     yearly ≈ 0.083). Since one_time's multiplier is 0, summing
 *     `amount * multiplier` ALREADY excludes one_time naturally —
 *     this function makes that boundary explicit so future readers
 *     don't have to remember the multiplier=0 trick.
 *   - Variable = real-life transactions logged for THIS month
 *     (typically by the coach via the propose_expense tool, see
 *     Phase 3.1). Filtered by `created_at` against UTC month
 *     boundaries; one-time entries from earlier months are kept on
 *     the /expenses ledger but excluded from "this month's total".
 *
 * Total = fixed + variable. Transactions = count of variable lines
 * (NOT including recurring rows — recurring is "1 rent line", not
 * "30 transactions").
 *
 * Pure function: easy to unit-test, no DB access, no I/O. `now` is
 * injectable so tests can freeze time without monkey-patching Date.
 */
export type ExpenseLike = {
  amount: number;
  frequency: string;
  created_at: string;
};

export interface ExpenseBuckets {
  /** Sum of recurring lines normalised to a monthly cadence. */
  fixed: number;
  /** Sum of one_time lines whose `created_at` falls in `now`'s UTC month. */
  variable: number;
  /** fixed + variable. The number the dashboard "Dépenses totales" card shows. */
  total: number;
  /** Count of one_time lines included in the variable bucket. */
  transactions: number;
}

export function computeExpenseBuckets(
  expenses: readonly ExpenseLike[],
  options: { now?: Date } = {},
): ExpenseBuckets {
  const now = options.now ?? new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
  );

  let fixed = 0;
  let variable = 0;
  let transactions = 0;

  for (const e of expenses) {
    if (e.frequency === "one_time") {
      // Parse the ISO timestamp once. Date.parse returns NaN on
      // malformed strings — we skip such rows rather than crash.
      const ts = Date.parse(e.created_at);
      if (!Number.isFinite(ts)) continue;
      if (ts >= monthStart && ts < nextMonthStart) {
        variable += e.amount;
        transactions += 1;
      }
    } else {
      // Recurring path. frequencyMultiplier returns 1 for unknown
      // frequencies — same behaviour as totalMonthly, so no
      // regression versus the existing aggregate.
      fixed += e.amount * frequencyMultiplier(e.frequency);
    }
  }

  return {
    fixed,
    variable,
    total: fixed + variable,
    transactions,
  };
}
