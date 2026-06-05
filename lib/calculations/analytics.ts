import { frequencyMultiplier } from "@/lib/calculations/aggregate";

/**
 * Phase 3.1.2 — analytics primitives.
 *
 * Pure helpers used by /expenses/analytics, the dashboard chart, and
 * the coach finance context. Pure = trivially unit-testable + same
 * logic everywhere = no drift between dashboard, page, and prompt.
 *
 * Vocabulary:
 *   - "fixed"     — recurring entries (anything except one_time),
 *                   normalised to a monthly cadence via the existing
 *                   `frequencyMultiplier`.
 *   - "variable"  — one_time entries, NOT normalised (they ARE the
 *                   amount they say they are) but only counted when
 *                   they fall inside the active period window.
 *   - "period"    — analytics window: week / month / year / 12 months.
 *
 * The split mirrors Phase 3.1.1 `computeExpenseBuckets` exactly so
 * the analytics totals always equal the headline dashboard numbers
 * when the user selects the "this month" filter.
 */

export type AnalyticsPeriod = "week" | "month" | "year" | "twelve_months";

export interface PeriodWindow {
  /** UTC ms — inclusive lower bound (typical) */
  start: number;
  /** UTC ms — exclusive upper bound (typical) */
  end: number;
}

/**
 * Build the [start, end) window for an analytics period anchored on
 * `now`. UTC throughout so the boundaries are stable regardless of
 * the user's locale time zone (Swiss / French users included).
 */
export function getPeriodWindow(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): PeriodWindow {
  switch (period) {
    case "week": {
      // ISO week start: Monday at 00:00 UTC of the week containing `now`.
      const dow = (now.getUTCDay() + 6) % 7; // 0 = Mon … 6 = Sun
      const start = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - dow,
      );
      const end = start + 7 * 86400000;
      return { start, end };
    }
    case "month": {
      const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      return { start, end };
    }
    case "year": {
      const start = Date.UTC(now.getUTCFullYear(), 0, 1);
      const end = Date.UTC(now.getUTCFullYear() + 1, 0, 1);
      return { start, end };
    }
    case "twelve_months": {
      // Rolling 12 months ending at the END of the current month so
      // the "this month" portion is always included.
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      const start = Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1);
      return { start, end };
    }
    default: {
      // Exhaustive switch — TypeScript guarantees never here.
      const _exhaust: never = period;
      throw new Error(`Unknown period: ${_exhaust as string}`);
    }
  }
}

export type AnalyticsExpense = {
  amount: number;
  category: string;
  frequency: string;
  created_at: string;
};

export interface CategoryBreakdownRow {
  category: string;
  /**
   * Total spent in this category over the window. Recurring rows
   * count as `amount * multiplier * months_in_window`; one_time rows
   * count at face value when they fall inside the window.
   */
  total: number;
  /** Count of one_time entries in this category in the window. */
  transactions: number;
  /** total / sum(all totals) — 0 when grand total is 0. */
  share: number;
}

/**
 * How many monthly periods fit inside the named period. We use a
 * lookup keyed by AnalyticsPeriod rather than computing from the
 * window's day span because calendar months are 28-31 days long —
 * dividing by 30.44 days makes "this month" 0.99 and yearly recurring
 * costs land 0.5%-3% off the dashboard's "this month" number, which
 * is unacceptable for a finance app. Exact integer scaling is the
 * right semantic for week/month/year/12-month surfaces.
 */
function monthsInPeriod(period: AnalyticsPeriod): number {
  switch (period) {
    case "week":
      return 7 / 30.4375;
    case "month":
      return 1;
    case "year":
      return 12;
    case "twelve_months":
      return 12;
  }
}

export interface PeriodTotals {
  /** Recurring entries normalised onto the window's length. */
  fixed: number;
  /** One_time entries whose created_at lands inside the window. */
  variable: number;
  /** fixed + variable. */
  total: number;
  /** Number of one_time entries inside the window. */
  transactions: number;
}

/**
 * Compute the fixed/variable totals for an analytics period.
 * Independent of `computeExpenseBuckets` so the analytics page can
 * change period without recomputing the dashboard's "this month"
 * numbers — but for `period="month"` it returns numbers exactly
 * equal to the dashboard's "this month" buckets.
 */
export function computePeriodTotals(
  expenses: readonly AnalyticsExpense[],
  period: AnalyticsPeriod,
  now: Date = new Date(),
): PeriodTotals {
  const window = getPeriodWindow(period, now);
  let fixedMonthly = 0;
  let variable = 0;
  let transactions = 0;

  for (const e of expenses) {
    if (e.frequency === "one_time") {
      const ts = Date.parse(e.created_at);
      if (!Number.isFinite(ts)) continue;
      if (ts >= window.start && ts < window.end) {
        variable += e.amount;
        transactions += 1;
      }
    } else {
      fixedMonthly += e.amount * frequencyMultiplier(e.frequency);
    }
  }

  const fixed = fixedMonthly * monthsInPeriod(period);
  return {
    fixed,
    variable,
    total: fixed + variable,
    transactions,
  };
}

/**
 * Aggregate expenses by category over the period window.
 *
 * Recurring entries are scaled by `monthsInWindow(window)` so a
 * 1500/month rent shows as 18000 over a 12-month window. one_time
 * entries are summed at face value if `created_at` is inside.
 *
 * Returned rows are sorted by total descending; categories with 0
 * are kept so the analytics page can render "Loisirs : 0 CHF" rather
 * than a hole.
 */
export function buildCategoryBreakdown(
  expenses: readonly AnalyticsExpense[],
  period: AnalyticsPeriod,
  allCategoryIds: readonly string[],
  now: Date = new Date(),
): CategoryBreakdownRow[] {
  const window = getPeriodWindow(period, now);
  const months = monthsInPeriod(period);
  const map = new Map<string, { total: number; transactions: number }>();
  for (const id of allCategoryIds) {
    map.set(id, { total: 0, transactions: 0 });
  }

  for (const e of expenses) {
    if (e.frequency === "one_time") {
      const ts = Date.parse(e.created_at);
      if (!Number.isFinite(ts)) continue;
      if (ts < window.start || ts >= window.end) continue;
      const slot = map.get(e.category) ?? { total: 0, transactions: 0 };
      slot.total += e.amount;
      slot.transactions += 1;
      map.set(e.category, slot);
    } else {
      const slot = map.get(e.category) ?? { total: 0, transactions: 0 };
      slot.total += e.amount * frequencyMultiplier(e.frequency) * months;
      map.set(e.category, slot);
    }
  }

  const rows = Array.from(map.entries()).map(([category, v]) => ({
    category,
    total: v.total,
    transactions: v.transactions,
    share: 0,
  }));
  const grand = rows.reduce((s, r) => s + r.total, 0);
  for (const r of rows) {
    r.share = grand > 0 ? r.total / grand : 0;
  }
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

export interface CategoryBudgetEntry {
  category: string;
  monthly_limit: number;
}

export interface BudgetStatusRow {
  category: string;
  /** What the user spent THIS MONTH in this category. */
  spent: number;
  /** Monthly cap configured. */
  limit: number;
  /** spent / limit, clamped to [0, ∞). */
  ratio: number;
  /** "ok" | "warning" (≥ 80%) | "over" (> 100%) */
  status: "ok" | "warning" | "over";
  /** limit - spent (can be negative when over). */
  remaining: number;
}

/**
 * Marry the monthly category totals with the user's per-category
 * budgets and tag each line with its status. Only categories that
 * HAVE a budget appear — categories without a configured limit are
 * not relevant for the "respect" view.
 */
export function buildBudgetStatus(
  expenses: readonly AnalyticsExpense[],
  budgets: readonly CategoryBudgetEntry[],
  now: Date = new Date(),
): BudgetStatusRow[] {
  if (budgets.length === 0) return [];
  const breakdown = buildCategoryBreakdown(
    expenses,
    "month",
    budgets.map((b) => b.category),
    now,
  );
  const spentMap = new Map(breakdown.map((r) => [r.category, r.total]));

  return budgets.map((b) => {
    const spent = spentMap.get(b.category) ?? 0;
    const ratio = b.monthly_limit > 0 ? spent / b.monthly_limit : 0;
    const status: BudgetStatusRow["status"] =
      ratio > 1 ? "over" : ratio >= 0.8 ? "warning" : "ok";
    return {
      category: b.category,
      spent,
      limit: b.monthly_limit,
      ratio,
      status,
      remaining: b.monthly_limit - spent,
    };
  });
}
