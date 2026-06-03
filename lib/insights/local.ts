/**
 * Local insight generator — produces a single "headline" insight from a
 * user's financial snapshot, deterministically and without calling any
 * external LLM. Used today as the onboarding wow-moment and as the
 * dashboard "Insight du jour" surface. When ANTHROPIC_API_KEY is wired
 * up later, callers can opt into a richer LLM-generated version; the
 * shape returned here stays stable so the UI doesn't change.
 *
 * Design rules:
 *  - never invent numbers — only echo what we computed from real fields
 *  - keep tone calm and concrete, never judgmental
 *  - one headline + one supporting line + one concrete next action
 *
 * Locale: the helper returns translation KEYS (under
 * `dashboard.insights.*`) plus ICU params. The rendering component
 * (DailyInsightCard, InsightStep) does the t() lookup so the same
 * function powers any locale.
 */
import { formatCurrency } from "@/lib/utils";

export type InsightInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyDebt: number;
  hasEmergencyFund: boolean;
  perceivedStress: number;
  situation: "struggling" | "tight" | "stable" | "comfortable";
  mainGoal?: string | null;
  behaviorTraits?: readonly string[];
  /** Picked in /settings → Coaching memory, or derived from traits. */
  coachingTone?: "calm" | "direct" | "structured" | "gentle";
  currency?: string;
  locale?: string;
};

export type Insight = {
  /** Translation key under `dashboard.insights.*`. */
  headlineKey: string;
  bodyKey: string;
  nextActionKey: string;
  /** May be null when there's no metric box to render. */
  metricLabelKey: string | null;
  /** Pre-formatted display string (currency/percent in user locale). */
  metric: string | null;
  tone: "warning" | "neutral" | "positive";
  /** ICU params shared by headline / body / nextAction. */
  params: Record<string, string | number>;
};

const round = (n: number) => Math.round(n);

export function generateLocalInsight(input: InsightInput): Insight {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    monthlyDebt,
    hasEmergencyFund,
    behaviorTraits = [],
    coachingTone,
    currency = "CHF",
    locale,
  } = input;

  const traits = new Set(behaviorTraits);
  const tone: "calm" | "direct" | "structured" | "gentle" =
    coachingTone ??
    (traits.has("anxious") || traits.has("avoidant")
      ? "calm"
      : traits.has("motivated")
        ? "direct"
        : traits.has("organized") || traits.has("disciplined")
          ? "structured"
          : traits.has("lost") || traits.has("rebuilding")
            ? "gentle"
            : "calm");

  const fmt = (n: number) => formatCurrency(n, currency, locale);
  const cashflow = monthlyIncome - monthlyExpenses;
  const runway = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : Infinity;
  const savingsRate = monthlyIncome > 0 ? cashflow / monthlyIncome : 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  // Cashflow negative → highest priority.
  if (cashflow < 0) {
    const gap = Math.abs(cashflow);
    const targetCut = Math.max(20, round(gap * 0.5));
    return {
      headlineKey: "cashflowNegative.headline",
      bodyKey: traits.has("avoidant")
        ? "cashflowNegative.bodyAvoidant"
        : "cashflowNegative.bodyDefault",
      nextActionKey: "cashflowNegative.nextAction",
      metricLabelKey: "cashflowNegative.metricLabel",
      metric: fmt(gap),
      tone: "warning",
      params: { gap: fmt(gap), targetCut: fmt(targetCut) },
    };
  }

  // Debt > 30% of income → debt priority.
  if (dti >= 30 && monthlyDebt > 0) {
    return {
      headlineKey: "highDti.headline",
      bodyKey: "highDti.body",
      nextActionKey: "highDti.nextAction",
      metricLabelKey: "highDti.metricLabel",
      metric: `${dti.toFixed(0)}%`,
      tone: "warning",
      params: { pct: dti.toFixed(0) },
    };
  }

  // No emergency fund + positive cashflow → foundation.
  if (!hasEmergencyFund && runway < 1 && cashflow > 0) {
    const monthlyTarget = Math.max(50, round(cashflow * 0.3));
    return {
      headlineKey: "emergencyFundFirst.headline",
      bodyKey: traits.has("anxious")
        ? "emergencyFundFirst.bodyAnxious"
        : "emergencyFundFirst.bodyDefault",
      nextActionKey: "emergencyFundFirst.nextAction",
      metricLabelKey: "emergencyFundFirst.metricLabel",
      metric: fmt(monthlyTarget),
      tone: "neutral",
      params: { monthlyTarget: fmt(monthlyTarget) },
    };
  }

  // Low but positive cashflow → gentle optimisation.
  if (savingsRate < 0.05 && monthlyIncome > 0) {
    const estimate = round(monthlyExpenses * 0.08);
    return {
      headlineKey: "lowSavings.headline",
      bodyKey: "lowSavings.body",
      nextActionKey: "lowSavings.nextAction",
      metricLabelKey: "lowSavings.metricLabel",
      metric: fmt(estimate),
      tone: "neutral",
      params: { estimate: fmt(estimate) },
    };
  }

  // Runway > 3 months and savings rate ≥ 15% → acceleration.
  if (runway >= 3 && savingsRate >= 0.15) {
    const monthlyAvailable = round(cashflow);
    return {
      headlineKey: "solidAcceleration.headline",
      bodyKey: "solidAcceleration.body",
      nextActionKey: "solidAcceleration.nextAction",
      metricLabelKey: "solidAcceleration.metricLabel",
      metric: fmt(monthlyAvailable),
      tone: "positive",
      params: { pct: (savingsRate * 100).toFixed(0) },
    };
  }

  // Intermediate — encouragement + tone-adapted nudge.
  const projection = round(cashflow * 12);
  const isPositive = projection > 0;

  const bodyKey =
    tone === "direct"
      ? "intermediate.bodyDirect"
      : tone === "structured"
        ? "intermediate.bodyStructured"
        : tone === "gentle"
          ? "intermediate.bodyGentle"
          : traits.has("motivated")
            ? "intermediate.bodyMotivated"
            : "intermediate.bodyCalm";

  const nextActionKey =
    tone === "structured"
      ? "intermediate.nextActionStructured"
      : tone === "direct"
        ? "intermediate.nextActionDirect"
        : "intermediate.nextActionCalm";

  return {
    headlineKey: isPositive
      ? "intermediate.headlinePositive"
      : "intermediate.headlineNeutral",
    bodyKey,
    nextActionKey,
    metricLabelKey: isPositive
      ? "intermediate.metricLabelPositive"
      : "intermediate.metricLabelNeutral",
    metric: isPositive ? fmt(projection) : fmt(0),
    tone: isPositive ? "positive" : "neutral",
    params: { projection: fmt(projection) },
  };
}
