/**
 * Pure helpers to label where a user sits in the LIBERIA journey and
 * how "activated" their account is. Used by the admin dashboard and by
 * future server-side conditional logic (e.g. which email cadence to
 * apply). Pure functions over already-loaded data — no DB hop.
 *
 * Design rules:
 *  - never branch on PII; only on subscription status + activity flags
 *  - keep stage labels stable so future analytics segmentation works
 *  - score is intentionally coarse (6 boolean milestones, 100 / 6 each)
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const INACTIVITY_THRESHOLD_DAYS = 14;

export type UserStage =
  | "new" // signup, no onboarding
  | "onboarded" // onboarding done, no subscription yet
  | "trialing" // active trial
  | "active" // paying subscriber
  | "lapsed" // canceled / past_due / paused
  | "inactive"; // long_inactive (regardless of billing state)

export type DeriveUserStageInput = {
  onboardingCompleted: boolean;
  subscriptionStatus: string | null;
  /** Timestamp (ms) of the user's most recent activity; null if unknown. */
  lastActivityMs: number | null;
  /** Override clock for deterministic tests. */
  now?: Date;
};

/**
 * Labels the user's current stage. Priority order ensures the stage
 * reflects what's most useful to know about the user RIGHT NOW:
 *   1. inactive — drives re-engagement
 *   2. lapsed — drives recovery
 *   3. trialing — drives trial-end touchpoints
 *   4. active — happy paying user
 *   5. onboarded — primary conversion target
 *   6. new — primary onboarding target
 */
export function deriveUserStage(input: DeriveUserStageInput): UserStage {
  const nowMs = (input.now ?? new Date()).getTime();
  const inactive =
    input.lastActivityMs !== null &&
    nowMs - input.lastActivityMs > INACTIVITY_THRESHOLD_DAYS * MS_PER_DAY;
  if (inactive) return "inactive";

  const status = input.subscriptionStatus;
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (
    status === "past_due" ||
    status === "unpaid" ||
    status === "canceled" ||
    status === "paused" ||
    status === "incomplete" ||
    status === "incomplete_expired"
  ) {
    return "lapsed";
  }

  if (input.onboardingCompleted) return "onboarded";
  return "new";
}

export type ActivationInput = {
  onboardingCompleted: boolean;
  hasIncome: boolean;
  hasExpense: boolean;
  hasGoal: boolean;
  hasPlan: boolean;
  hasCoachMessage: boolean;
};

export type ActivationSnapshot = {
  /** 0–100, rounded. Coarse on purpose. */
  score: number;
  /** Milestones the user has crossed (for explainability in admin). */
  signals: ReadonlyArray<keyof ActivationInput>;
};

/**
 * Six boolean milestones, each worth ~16.7 points. A user is "fully
 * activated" (score 100) when they've completed onboarding AND have
 * income + expense + goal + plan + at least one coach exchange.
 */
export function computeActivationScore(input: ActivationInput): ActivationSnapshot {
  const milestones: ReadonlyArray<keyof ActivationInput> = [
    "onboardingCompleted",
    "hasIncome",
    "hasExpense",
    "hasGoal",
    "hasPlan",
    "hasCoachMessage",
  ];
  const signals = milestones.filter((m) => input[m]);
  const score = Math.round((signals.length / milestones.length) * 100);
  return { score, signals };
}
