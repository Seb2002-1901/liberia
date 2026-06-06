import type { CompletenessResult } from "@/lib/calculations/completeness";
import type {
  Opportunity,
  OpportunityPriority,
} from "@/lib/calculations/opportunities";

/**
 * Phase 3.1.7 — single "next best action" derivation.
 *
 * Pure function over the snapshot the dashboard already computes
 * (completeness, opportunities, runway, savings rate, goal count).
 * Returns ONE action — the dashboard surfaces a single
 * recommendation, never a wall of suggestions. The full breakdown
 * stays on the analytics page.
 *
 * Priority ladder (first matching rule wins):
 *
 *   1. Completion gate — when STRUCTURELLE reliability is low, every
 *      other number is suspect. The user must complete their profile
 *      before any optimisation advice makes sense.
 *   2. High-priority opportunity — typically a budget overrun > 20 %
 *      or an emergency-fund alert. Has its own concrete amount.
 *   3. Medium-priority opportunity — variable share too high, fixed
 *      ratio elevated, etc.
 *   4. Low emergency fund (independent of opportunities) — direct
 *      runway < 1 month signal.
 *   5. Set a goal — gentle nudge when nothing else is wrong but no
 *      objective has been defined.
 *   6. Continue — the healthy default.
 *
 * The output gives the UI everything it needs to render the card:
 * title key, body key, priority tag, optional CTA route + label key,
 * and the chiffré impact ONLY when canEstimateSavings is true.
 */

export type NextActionKind =
  | "complete_profile"
  | "act_on_opportunity"
  | "build_emergency_fund"
  | "set_first_goal"
  | "continue";

export type NextActionPriority = OpportunityPriority;

export interface NextAction {
  kind: NextActionKind;
  priority: NextActionPriority;
  /** Stable i18n key for the title (under app.dashboard.nextAction.kind.*). */
  titleKey: string;
  /** Stable i18n key for the body. */
  bodyKey: string;
  /** ICU payload — varies by kind. */
  payload: Record<string, string | number>;
  /**
   * Where to send the user when they tap the CTA. "openCompletion"
   * triggers the completion modal client-side; "navigate" navigates
   * to the analytics / budget / goals route.
   */
  cta:
    | { type: "openCompletion"; labelKey: string }
    | { type: "navigate"; href: string; labelKey: string }
    | null;
  /** When non-zero, the dashboard renders the impact under the CTA. */
  monthlyImpact: number;
}

export interface NextActionInput {
  completeness: CompletenessResult;
  /** Opportunities already sorted by detect engine (priority DESC). */
  opportunities: readonly Opportunity[];
  /** Months of expenses currently covered by savings. */
  runwayMonths: number;
  /** Count of goals defined; 0 means "set your first one". */
  goalCount: number;
}

/** Standard routes — kept here to avoid coupling to next/router. */
const ROUTES = {
  expenseAnalytics: "/expenses/analytics",
  goals: "/goals",
};

export function computeNextAction(input: NextActionInput): NextAction {
  const { completeness, opportunities, runwayMonths, goalCount } = input;

  // 1. Completion gate.
  if (completeness.reliability !== "high") {
    return {
      kind: "complete_profile",
      priority: "high",
      titleKey: "complete_profile.title",
      bodyKey:
        completeness.reliability === "low"
          ? "complete_profile.bodyLow"
          : "complete_profile.bodyMedium",
      payload: {
        score: completeness.structurelle,
      },
      cta: {
        type: "openCompletion",
        labelKey: "complete_profile.cta",
      },
      monthlyImpact: 0,
    };
  }

  // 2 + 3. Act on the top opportunity — pick the highest-priority
  // with a concrete monthly impact. If only zero-impact qualitative
  // signals remain (e.g. high_insurance_share with no shave), fall
  // through to the next rule rather than surfacing a chiffré 0.
  const actionable = opportunities.find((o) => o.monthlyImpact > 0);
  if (actionable) {
    return {
      kind: "act_on_opportunity",
      priority: actionable.priority,
      titleKey: `act_on_opportunity.${actionable.kind}.title`,
      bodyKey: `act_on_opportunity.${actionable.kind}.body`,
      payload: { ...actionable.payload },
      cta: {
        type: "navigate",
        href: ROUTES.expenseAnalytics,
        labelKey: "act_on_opportunity.cta",
      },
      monthlyImpact: actionable.monthlyImpact,
    };
  }

  // 4. Low emergency fund — independent of opportunities (might be
  // qualitative, no impact $).
  if (Number.isFinite(runwayMonths) && runwayMonths < 1) {
    return {
      kind: "build_emergency_fund",
      priority: "high",
      titleKey: "build_emergency_fund.title",
      bodyKey: "build_emergency_fund.body",
      payload: { months: round2(runwayMonths) },
      cta: {
        type: "navigate",
        href: ROUTES.goals,
        labelKey: "build_emergency_fund.cta",
      },
      monthlyImpact: 0,
    };
  }

  // 5. Set a goal when none exists. Low priority — this is a nudge.
  if (goalCount === 0) {
    return {
      kind: "set_first_goal",
      priority: "low",
      titleKey: "set_first_goal.title",
      bodyKey: "set_first_goal.body",
      payload: {},
      cta: {
        type: "navigate",
        href: ROUTES.goals,
        labelKey: "set_first_goal.cta",
      },
      monthlyImpact: 0,
    };
  }

  // 6. Continue — the healthy default.
  return {
    kind: "continue",
    priority: "low",
    titleKey: "continue.title",
    bodyKey: "continue.body",
    payload: {},
    cta: null,
    monthlyImpact: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
