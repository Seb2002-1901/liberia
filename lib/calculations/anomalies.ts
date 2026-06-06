import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import type { Expense } from "@/types/database";
import type { ExpenseBuckets } from "@/lib/calculations/aggregate";

/**
 * Phase 3.1.6 — anomaly detection.
 *
 * Signals that ANNOTATE the user's data without judging it. The
 * dashboard / analytics surfaces these next to the relevant card
 * with a calm "vérifie ce montant" tone — never as accusations.
 *
 * Pure function over the user's snapshot. No I/O, no clock unless
 * injected. The coach receives the list and adapts its phrasing
 * (the prompt rules forbid the coach from drawing conclusions
 * from a flagged anomaly without first asking the user to confirm
 * the number).
 *
 * Hard rules:
 *   - At most MAX_ANOMALIES entries — never drown the user.
 *   - Each entry has a stable `kind` for i18n lookup + a `severity`
 *     of "info" (worth noting) or "warning" (likely error). NO
 *     "error" severity — we never tell the user a number is wrong,
 *     only that it MAY be.
 */

export type AnomalyKind =
  | "housing_over_50pct_income"
  | "single_category_over_80pct"
  | "unusual_high_one_time"
  | "fixed_expense_outlier"
  | "high_income_low_emergency";

export type AnomalySeverity = "info" | "warning";

export interface Anomaly {
  kind: AnomalyKind;
  severity: AnomalySeverity;
  /** ICU args the UI passes to the i18n title/body templates. */
  payload: Record<string, string | number>;
}

export interface DetectAnomaliesInput {
  expenses: readonly Expense[];
  expenseBuckets: ExpenseBuckets;
  monthlyIncome: number;
  currentSavings: number;
  /** Optional: derived from financial_profiles.has_emergency_fund. */
  runwayMonths: number;
}

const MAX_ANOMALIES = 5;

// Thresholds — tuned conservatively so we surface real signals
// without flagging healthy edge cases.
const HOUSING_RATIO_FLAG = 0.5; // > 50 % of income
const DOMINANT_CATEGORY_FLAG = 0.8; // > 80 % of total expenses
// "Unusually high" for a one-off transaction: > 3× the median of
// other one-offs this month, AND above 500 in absolute terms (so we
// don't flag "I spent 30 at Coop" when the median is 8).
const ONE_TIME_OUTLIER_MULTIPLIER = 3;
const ONE_TIME_OUTLIER_MIN_AMOUNT = 500;
// "Fixed expense outlier" — a recurring line whose monthly-
// equivalent amount is > 30 % of income. Catches a misclassified
// "loyer 15000 par mois" when the income is 6000.
const FIXED_OUTLIER_RATIO = 0.3;
const FIXED_OUTLIER_MIN_AMOUNT = 1000;
// "Comfortable income but thin emergency fund" — income > 8 000
// (CHF / per month) but runway < 1 month.
const HIGH_INCOME_THRESHOLD = 8000;
const THIN_RUNWAY_THRESHOLD = 1;

export function detectAnomalies(input: DetectAnomaliesInput): Anomaly[] {
  const out: Anomaly[] = [];
  const { expenses, expenseBuckets, monthlyIncome, runwayMonths } = input;

  // 1) Housing > 50 % of income (the canonical Swiss / French rule
  //    of thumb — Logement représente 60% des dépenses est différent
  //    de Logement représente 60% du REVENU; ici on parle bien du
  //    revenu pour signaler une situation tendue).
  if (monthlyIncome > 0) {
    const housingMonthly = expenses
      .filter((e) => e.category === "housing")
      .reduce((s, e) => s + e.amount * frequencyMultiplier(e.frequency), 0);
    const ratio = housingMonthly / monthlyIncome;
    if (ratio > HOUSING_RATIO_FLAG && housingMonthly > 0) {
      push(out, {
        kind: "housing_over_50pct_income",
        severity: "warning",
        payload: {
          ratio: round2(ratio * 100),
          amount: round2(housingMonthly),
        },
      });
    }
  }

  // 2) Dominant category > 80 % of total spending. Different from
  //    the "dominant_category" opportunity (which uses 50 %): this
  //    is the "almost certainly missing other categories" signal.
  if (expenseBuckets.total > 0) {
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      const monthly = e.amount * frequencyMultiplier(e.frequency);
      byCategory.set(
        e.category,
        (byCategory.get(e.category) ?? 0) + monthly,
      );
    }
    let top: { category: string; total: number } | null = null;
    for (const [category, total] of byCategory) {
      if (!top || total > top.total) top = { category, total };
    }
    if (top && top.total / expenseBuckets.total > DOMINANT_CATEGORY_FLAG) {
      push(out, {
        kind: "single_category_over_80pct",
        severity: "warning",
        payload: {
          category: top.category,
          share: round2((top.total / expenseBuckets.total) * 100),
        },
      });
    }
  }

  // 3) Unusual one-off — > 3× median + > 500 absolute.
  const oneTimes = expenses
    .filter((e) => e.frequency === "one_time")
    .map((e) => ({ id: e.id, label: e.label, amount: e.amount }));
  if (oneTimes.length >= 3) {
    const median = medianOf(oneTimes.map((t) => t.amount));
    const outlier = oneTimes
      .filter(
        (t) =>
          t.amount >= ONE_TIME_OUTLIER_MIN_AMOUNT &&
          t.amount > median * ONE_TIME_OUTLIER_MULTIPLIER,
      )
      .sort((a, b) => b.amount - a.amount)[0];
    if (outlier) {
      push(out, {
        kind: "unusual_high_one_time",
        severity: "info",
        payload: {
          label: outlier.label,
          amount: round2(outlier.amount),
          median: round2(median),
        },
      });
    }
  }

  // 4) Fixed-expense outlier — a recurring line whose monthly-
  //    equivalent eats > 30 % of income AND is above 1000 absolute
  //    (so we don't flag a "monthly 2000" rent on a "monthly 1500"
  //    income twice; the housing rule catches that). This one is
  //    aimed at obvious typos: a 1500 / week rent is 6500 / month.
  if (monthlyIncome > 0) {
    for (const e of expenses) {
      if (e.frequency === "one_time") continue;
      const monthly = e.amount * frequencyMultiplier(e.frequency);
      if (
        monthly > FIXED_OUTLIER_MIN_AMOUNT &&
        monthly / monthlyIncome > FIXED_OUTLIER_RATIO &&
        // Skip housing (covered by rule 1) to avoid duplicate flags.
        e.category !== "housing"
      ) {
        push(out, {
          kind: "fixed_expense_outlier",
          severity: "info",
          payload: {
            label: e.label,
            category: e.category,
            monthly: round2(monthly),
            ratio: round2((monthly / monthlyIncome) * 100),
          },
        });
        // One outlier per detector run — don't drown the user.
        break;
      }
    }
  }

  // 5) High income + thin emergency fund — a signal that "where is
  //    the cash going?" question is worth asking. We don't conclude;
  //    we only flag.
  if (
    monthlyIncome > HIGH_INCOME_THRESHOLD &&
    Number.isFinite(runwayMonths) &&
    runwayMonths < THIN_RUNWAY_THRESHOLD
  ) {
    push(out, {
      kind: "high_income_low_emergency",
      severity: "info",
      payload: {
        income: round2(monthlyIncome),
        months: round2(runwayMonths),
      },
    });
  }

  // Warnings first, then info. Within each tier preserve detection
  // order so the output is deterministic for tests.
  return out
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, MAX_ANOMALIES);
}

function push(arr: Anomaly[], a: Anomaly) {
  arr.push(a);
}
function severityWeight(s: AnomalySeverity): number {
  return s === "warning" ? 2 : 1;
}
function medianOf(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
