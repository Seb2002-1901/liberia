import type { NextAction } from "@/lib/calculations/next-action";
import type {
  AdviceConfidence,
  AdviceConfidenceResult,
} from "@/lib/calculations/advice-confidence";
import type { CompletenessResult } from "@/lib/calculations/completeness";
import type { DisciplineResult } from "@/lib/calculations/discipline";
import type {
  Opportunity,
  OpportunityPriority,
} from "@/lib/calculations/opportunities";
import type { BudgetProgress } from "@/lib/calculations/budget-goals";
import type {
  CategoryBudget,
  Expense,
  Goal,
  UserMemory,
  UserMemoryEntry,
} from "@/types/database";

/**
 * Phase 3.1.11 — Advisor Engine.
 *
 * One pure function that consumes EVERY existing primitive already
 * computed for the dashboard (next-action, advice-confidence,
 * completeness, discipline, opportunities, budgets, goals, memory)
 * and produces a single consolidated AdvisorSummary the UI cards
 * can read directly. Zero new financial calculation; only
 * composition.
 *
 * Hard rules from the brief:
 *   - ONE primaryAction. Never several.
 *   - Maximum 3 priorities total.
 *   - Maximum 3 strengths.
 *   - Maximum 3 weaknesses.
 *   - Maximum 5 "learnedAboutUser" observations.
 *   - Maximum 5 "progressSinceLastVisit" events.
 *
 * Pure: no I/O, no clock unless injected. Deterministic ordering.
 *
 * Output strategy:
 *   - Every list item is a STABLE i18n key + optional payload, so
 *     the UI renders via t(`...${kind}.title`, payload). This keeps
 *     the engine UI-agnostic and locale-agnostic.
 */

export type AdvisorPriority = OpportunityPriority;

export interface AdvisorAction {
  kind: string;
  priority: AdvisorPriority;
  /** ICU payload for the i18n template. */
  payload: Record<string, string | number>;
  /** When > 0, the UI renders the impact line. */
  monthlyImpact: number;
}

export interface AdvisorObservation {
  /** Stable key matched by the UI's i18n template. */
  kind: string;
  payload: Record<string, string | number>;
}

export interface AdvisorProgressEvent {
  /** Stable key matched by the UI's i18n template. */
  kind: string;
  /** When the underlying activity occurred — used for sort. */
  at: string;
  payload: Record<string, string | number>;
}

export interface AdvisorSummary {
  primaryAction: AdvisorAction;
  priorities: AdvisorAction[];
  strengths: AdvisorObservation[];
  weaknesses: AdvisorObservation[];
  learnedAboutUser: AdvisorObservation[];
  progressSinceLastVisit: AdvisorProgressEvent[];
  confidence: AdviceConfidence;
}

export interface BuildAdvisorSummaryInput {
  nextAction: NextAction;
  confidence: AdviceConfidenceResult;
  completeness: CompletenessResult;
  discipline: DisciplineResult;
  opportunities: readonly Opportunity[];
  budgetProgress: readonly BudgetProgress[];
  goals: readonly Goal[];
  goalsRespectedCount: number;
  expenses: readonly Expense[];
  categoryBudgets: readonly CategoryBudget[];
  memory: UserMemory | null;
  memoryEntries: readonly UserMemoryEntry[];
  /** Months of expenses covered by current savings. */
  runwayMonths: number;
  /** Decimal 0-1; e.g. 0.15 = 15 %. */
  savingsRate: number;
  /** Defaults to new Date() — injectable for tests. */
  now?: Date;
}

const MAX_PRIORITIES = 3;
const MAX_STRENGTHS = 3;
const MAX_WEAKNESSES = 3;
const MAX_LEARNED = 5;
const MAX_PROGRESS = 5;
const PROGRESS_WINDOW_DAYS = 7;

export function buildAdvisorSummary(
  input: BuildAdvisorSummaryInput,
): AdvisorSummary {
  return {
    primaryAction: buildPrimaryAction(input.nextAction),
    priorities: buildPriorities(input.opportunities, input.nextAction),
    strengths: buildStrengths(input),
    weaknesses: buildWeaknesses(input),
    learnedAboutUser: buildLearnedAboutUser(input),
    progressSinceLastVisit: buildProgress(input),
    confidence: input.confidence.level,
  };
}

/* -------------------------------------------------------------------------- */
/*  Primary action — straight projection of computeNextAction                    */
/* -------------------------------------------------------------------------- */

function buildPrimaryAction(action: NextAction): AdvisorAction {
  // computeNextAction already wraps the priority ladder; we
  // forward its title/body keys verbatim. The UI maps them to
  // dashboard.advisor.action.<kind>.<field> i18n templates.
  return {
    kind: action.titleKey,
    priority: action.priority,
    payload: action.payload,
    monthlyImpact: action.monthlyImpact,
  };
}

/* -------------------------------------------------------------------------- */
/*  Priorities — top 3 opportunities, including the primary action if distinct */
/* -------------------------------------------------------------------------- */

function buildPriorities(
  opportunities: readonly Opportunity[],
  primary: NextAction,
): AdvisorAction[] {
  // Already sorted by priority desc / impact desc in detectOpportunities.
  const out: AdvisorAction[] = [];
  for (const o of opportunities.slice(0, MAX_PRIORITIES)) {
    out.push({
      kind: `act_on_opportunity.${o.kind}`,
      priority: o.priority,
      payload: { ...o.payload },
      monthlyImpact: o.monthlyImpact,
    });
  }
  // Always include the primaryAction at position 0 unless it's
  // already represented by the same kind (avoid duplicate "complete
  // profile" vs "act_on_opportunity").
  const primaryKind = primary.titleKey;
  if (!out.some((p) => p.kind === primaryKind)) {
    out.unshift({
      kind: primaryKind,
      priority: primary.priority,
      payload: primary.payload,
      monthlyImpact: primary.monthlyImpact,
    });
  }
  return out.slice(0, MAX_PRIORITIES);
}

/* -------------------------------------------------------------------------- */
/*  Strengths — derived from existing health metrics                            */
/* -------------------------------------------------------------------------- */

function buildStrengths(input: BuildAdvisorSummaryInput): AdvisorObservation[] {
  const out: AdvisorObservation[] = [];

  // Discipline good / excellent
  if (input.discipline.tier === "excellent" || input.discipline.tier === "good") {
    out.push({
      kind: "good_discipline",
      payload: { score: input.discipline.score },
    });
  }

  // Healthy savings rate ≥ 10 %
  if (input.savingsRate >= 0.1) {
    out.push({
      kind: "regular_savings",
      payload: { rate: Math.round(input.savingsRate * 100) },
    });
  }

  // Solid emergency fund (≥ 3 months)
  if (Number.isFinite(input.runwayMonths) && input.runwayMonths >= 3) {
    out.push({
      kind: "emergency_fund_solid",
      payload: { months: round1(input.runwayMonths) },
    });
  }

  // Goals defined
  if (input.goals.length > 0) {
    out.push({
      kind: "goals_defined",
      payload: { count: input.goals.length },
    });
  }

  // Budgets mostly respected
  if (input.budgetProgress.length > 0) {
    const respected = input.budgetProgress.filter(
      (p) => p.status === "SUCCESS",
    ).length;
    const ratio = respected / input.budgetProgress.length;
    if (ratio >= 0.8) {
      out.push({
        kind: "budgets_respected",
        payload: { respected, total: input.budgetProgress.length },
      });
    }
  }

  // Comprehensive profile
  if (input.completeness.reliability === "high") {
    out.push({
      kind: "comprehensive_profile",
      payload: { score: input.completeness.structurelle },
    });
  }

  return out.slice(0, MAX_STRENGTHS);
}

/* -------------------------------------------------------------------------- */
/*  Weaknesses — derived from the same primitives, inverted                     */
/* -------------------------------------------------------------------------- */

function buildWeaknesses(
  input: BuildAdvisorSummaryInput,
): AdvisorObservation[] {
  const out: AdvisorObservation[] = [];

  // Missing critical categories (insurance / transport / income / housing)
  for (const missing of input.completeness.missing) {
    if (missing.severity === "high") {
      out.push({
        kind: `missing_${missing.area}`,
        payload: {},
      });
    }
    if (out.length >= MAX_WEAKNESSES) break;
  }

  // Over-budget categories — at most 1 to keep the list short
  if (out.length < MAX_WEAKNESSES) {
    const over = input.budgetProgress.find((p) => p.status === "OVER_LIMIT");
    if (over) {
      out.push({
        kind: "over_budget",
        payload: {
          category: over.category,
          amount: round2(over.overrun),
        },
      });
    }
  }

  // Low emergency fund
  if (
    out.length < MAX_WEAKNESSES &&
    Number.isFinite(input.runwayMonths) &&
    input.runwayMonths < 1
  ) {
    out.push({
      kind: "low_emergency_fund",
      payload: { months: round1(input.runwayMonths) },
    });
  }

  // Low savings rate
  if (out.length < MAX_WEAKNESSES && input.savingsRate < 0.05) {
    out.push({
      kind: "low_savings",
      payload: { rate: Math.round(input.savingsRate * 100) },
    });
  }

  // No goals
  if (out.length < MAX_WEAKNESSES && input.goals.length === 0) {
    out.push({ kind: "no_goals", payload: {} });
  }

  // No budgets configured
  if (out.length < MAX_WEAKNESSES && input.categoryBudgets.length === 0) {
    out.push({ kind: "no_budgets", payload: {} });
  }

  return out.slice(0, MAX_WEAKNESSES);
}

/* -------------------------------------------------------------------------- */
/*  Learned about you — from user_memory + user_memory_entries                  */
/* -------------------------------------------------------------------------- */

function buildLearnedAboutUser(
  input: BuildAdvisorSummaryInput,
): AdvisorObservation[] {
  const out: AdvisorObservation[] = [];
  const m = input.memory;

  // Coaching tone preference
  if (m?.coaching_tone) {
    out.push({
      kind: `tone_${m.coaching_tone}`,
      payload: {},
    });
  }

  // Top dynamic memory entries — ordered by importance, max 3
  const importantEntries = input.memoryEntries
    .filter((e) => e.archived_at === null && e.importance >= 4)
    .slice()
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);
  for (const entry of importantEntries) {
    out.push({
      kind: `memory_entry_${entry.kind}`,
      payload: { summary: entry.summary },
    });
    if (out.length >= MAX_LEARNED) return out;
  }

  // Recurring challenges (up to 2)
  for (const c of (m?.recurring_challenges ?? []).slice(0, 2)) {
    out.push({ kind: `challenge_${c}`, payload: {} });
    if (out.length >= MAX_LEARNED) return out;
  }

  // Spending triggers (1)
  if ((m?.spending_triggers ?? []).length > 0) {
    out.push({
      kind: `trigger_${m!.spending_triggers[0]}`,
      payload: {},
    });
  }

  return out.slice(0, MAX_LEARNED);
}

/* -------------------------------------------------------------------------- */
/*  Progress since last visit — derived from recent created_at                  */
/* -------------------------------------------------------------------------- */

function buildProgress(input: BuildAdvisorSummaryInput): AdvisorProgressEvent[] {
  const now = input.now ?? new Date();
  const cutoff = now.getTime() - PROGRESS_WINDOW_DAYS * 86400000;
  const events: AdvisorProgressEvent[] = [];

  const recentExpenses = input.expenses.filter(
    (e) => Date.parse(e.created_at) >= cutoff,
  );
  if (recentExpenses.length > 0) {
    events.push({
      kind: "new_expenses",
      at: recentExpenses[0].created_at,
      payload: { count: recentExpenses.length },
    });
  }

  const recentGoals = input.goals.filter(
    (g) => Date.parse(g.created_at) >= cutoff,
  );
  if (recentGoals.length > 0) {
    events.push({
      kind: "new_goals",
      at: recentGoals[0].created_at,
      payload: { count: recentGoals.length },
    });
  }

  const recentBudgets = input.categoryBudgets.filter(
    (b) => Date.parse(b.created_at) >= cutoff,
  );
  if (recentBudgets.length > 0) {
    events.push({
      kind: "new_budgets",
      at: recentBudgets[0].created_at,
      payload: { count: recentBudgets.length },
    });
  }

  const recentMemoryEntries = input.memoryEntries.filter(
    (e) => Date.parse(e.created_at) >= cutoff,
  );
  if (recentMemoryEntries.length > 0) {
    events.push({
      kind: "new_memory_entries",
      at: recentMemoryEntries[0].created_at,
      payload: { count: recentMemoryEntries.length },
    });
  }

  return events
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_PROGRESS);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
