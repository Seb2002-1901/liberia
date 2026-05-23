/**
 * Stripe configuration — Phase 1 scaffolding.
 * Real charge logic lands in a later phase; everything here is structure-only.
 */

export const STRIPE_PLANS = {
  premium_monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    amount: 9.9,
    interval: "month" as const,
  },
  premium_yearly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY ?? "",
    amount: 89,
    interval: "year" as const,
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PLANS;

/**
 * True when Stripe is wired up enough for /api/stripe/checkout to attempt
 * a Checkout Session. Only checks the secret key — the publishable key is
 * reserved for Phase 2 when we mount Stripe.js client-side.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
