import { clamp, roundInt } from "../utils";
import type { AxisConfidence, AxisResult } from "../types";

/**
 * Phase 3.2 — Axis 6 : Comportement (weight 5 %).
 *
 * Tiny share intentionally — large enough to nudge engagement,
 * small enough that gaming it (logging fake transactions) gains
 * at most 5 points before saturation.
 *
 *   engagement = tx + 0.5 × coach_msg + 2 × memory_entries
 *   score      = clamp(round(engagement × 4), 0, 100)
 *
 * Saturation at 25 engagement-units / month → score 100. Easily
 * reachable without effort overload, hard to game without genuine
 * use.
 */

export interface ComportementInput {
  /** Transactions logged in the last 30 days (already deduplicated). */
  txCount30d: number;
  /** Messages the user sent to the coach in the last 30 days, ≥ 5 words. */
  coachMsg30d: number;
  /** Memory entries the coach has created in the last 30 days. */
  memoryEntries30d: number;
  /** Days since the account was created. < 14 enters onboarding grace. */
  accountAgeDays: number;
}

const TX_WEIGHT = 1;
const COACH_MSG_WEIGHT = 0.5;
const MEMORY_ENTRY_WEIGHT = 2;
const ENGAGEMENT_TO_SCORE = 4;
const ONBOARDING_GRACE_DAYS = 14;

export function computeComportement(input: ComportementInput): AxisResult {
  const {
    txCount30d,
    coachMsg30d,
    memoryEntries30d,
    accountAgeDays,
  } = input;

  const engagement =
    TX_WEIGHT * txCount30d +
    COACH_MSG_WEIGHT * coachMsg30d +
    MEMORY_ENTRY_WEIGHT * memoryEntries30d;
  const score = clamp(roundInt(engagement * ENGAGEMENT_TO_SCORE), 0, 100);

  return {
    id: "comportement",
    score,
    confidence: resolveConfidence(engagement, accountAgeDays),
    components: {
      engagement: roundInt(engagement),
      tx_count: txCount30d,
      coach_msg: coachMsg30d,
      memory_entries: memoryEntries30d,
    },
  };
}

function resolveConfidence(
  engagement: number,
  accountAgeDays: number,
): AxisConfidence {
  // Brand-new accounts get a free pass — we don't have enough
  // observation window to judge engagement either way.
  if (accountAgeDays <= ONBOARDING_GRACE_DAYS) return "UNKNOWN";
  if (engagement >= 5) return "HIGH";
  if (engagement >= 1) return "MEDIUM";
  return "LOW";
}
