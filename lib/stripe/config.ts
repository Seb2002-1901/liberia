/**
 * Stripe configuration — LIBERIA modèle business.
 *
 * Deux plans, tous deux avec 14 jours d'essai gratuit :
 *  - premium_monthly : 14.99 CHF/mois
 *  - premium_yearly  : 119.99 CHF/an (≈ 9.99 CHF/mois — économie ~60 CHF/an)
 *
 * Les `priceId` sont créés dans le dashboard Stripe (Products → LIBERIA
 * Premium → ajouter 2 prices CHF). On les pointe via env, jamais hardcodés.
 */

export const TRIAL_DAYS = 14;
export const CURRENCY = "CHF";

export const STRIPE_PLANS = {
  premium_monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    amount: 14.99,
    interval: "month" as const,
    label: "Mensuel",
    monthlyEquivalent: 14.99,
  },
  premium_yearly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY ?? "",
    amount: 119.99,
    interval: "year" as const,
    label: "Annuel",
    monthlyEquivalent: 9.99,
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PLANS;

/** Économie annuelle si l'utilisateur choisit le plan annuel. */
export const YEARLY_SAVINGS_CHF =
  Math.round(
    (STRIPE_PLANS.premium_monthly.amount * 12 - STRIPE_PLANS.premium_yearly.amount) *
      100,
  ) / 100;

/**
 * True when Stripe is wired up enough for /api/stripe/checkout to attempt
 * a Checkout Session. Only checks the secret key — the publishable key is
 * reserved for Phase 4 if we mount Stripe.js client-side.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
