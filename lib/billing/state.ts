/**
 * Pure billing-state inference used by /settings/subscription and any
 * future surface (admin, emails) that needs to label a user's billing
 * situation without duplicating the heuristic.
 *
 * Priority order matters — see /settings/subscription/page.tsx for the
 * UX it drives:
 *   1. trialing  → trial countdown banner
 *   2. active    → green "Abonnement actif" banner
 *   3. past_due  → warning banner with portal CTA
 *   4. all other Stripe statuses (canceled / paused / incomplete*) → lapsed
 *   5. no status at all → kind="none" (registered before checkout)
 *
 * Tests in tests/unit/billing-state.test.ts exhaustively cover the
 * status string → BillingState mapping.
 */

export type SubscriptionView = {
  status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type BillingState =
  | { kind: "none" }
  | {
      kind: "trial";
      trialEndsAt: string | null;
      daysLeft: number | null;
      cancelAtPeriodEnd: boolean;
    }
  | {
      kind: "active";
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    }
  | {
      kind: "past_due";
      currentPeriodEnd: string | null;
    }
  | {
      kind: "lapsed";
      status: string | null;
    };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function inferBillingState(
  sub: SubscriptionView,
  now: Date = new Date(),
): BillingState {
  // No subscription row at all → registered user before checkout.
  if (!sub.status) return { kind: "none" };

  // Trialing — surface the countdown even if trial_ends_at is null
  // (legacy DB rows from before that column existed). Never let a
  // trialing user fall through to the lapsed banner.
  if (sub.status === "trialing") {
    const endsTs = sub.trial_ends_at
      ? new Date(sub.trial_ends_at).getTime()
      : null;
    const daysLeft =
      endsTs !== null && Number.isFinite(endsTs)
        ? Math.max(0, Math.ceil((endsTs - now.getTime()) / MS_PER_DAY))
        : null;
    return {
      kind: "trial",
      trialEndsAt: sub.trial_ends_at,
      daysLeft,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  // Trial-to-paid succeeded → access continues seamlessly. This is the
  // golden path: never show a soft paywall here.
  if (sub.status === "active") {
    return {
      kind: "active",
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  // Payment failure during a renewal — soft paywall + portal CTA.
  if (sub.status === "past_due" || sub.status === "unpaid") {
    return { kind: "past_due", currentPeriodEnd: sub.current_period_end };
  }

  // canceled / paused / incomplete / incomplete_expired → lapsed.
  // `paused` is what Stripe assigns when the trial ends without a
  // valid payment method (trial_settings.end_behavior.missing_payment_
  // method = "pause").
  return { kind: "lapsed", status: sub.status };
}
