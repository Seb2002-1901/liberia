/**
 * Stripe configuration — LIBERIA modèle business (mise à jour Q2 2026).
 *
 * Deux tiers × deux intervalles = 4 plans facturables. Chaque plan
 * démarre par 14 jours d'essai gratuit (carte requise à l'inscription,
 * aucun prélèvement pendant l'essai). Annulable avant la fin de l'essai
 * pour ne rien payer.
 *
 *  - standard_monthly : 14.95 CHF/mois
 *  - standard_yearly  : 149 CHF/an (≈ 12.42 CHF/mois — économie ~30 CHF/an)
 *  - premium_monthly  : 19.95 CHF/mois
 *  - premium_yearly   : 199 CHF/an (≈ 16.58 CHF/mois — économie ~40 CHF/an)
 *
 * Les `priceId` sont créés dans le dashboard Stripe (Products →
 * Standard + Premium → 2 prices CHF chacun). On les pointe via env,
 * jamais hardcodés.
 *
 * ⚠ Setup Stripe Dashboard nécessaire avant le go-live :
 *   - Produit "Standard" + 2 prices (monthly 14.95 CHF, yearly 149 CHF)
 *   - Produit "Premium"  + 2 prices (monthly 19.95 CHF, yearly 199 CHF)
 *   - 4 env vars NEXT_PUBLIC_STRIPE_PRICE_* renseignées.
 */

export const TRIAL_DAYS = 14;
export const CURRENCY = "CHF";

export const STRIPE_PLANS = {
  standard_monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY ?? "",
    amount: 14.95,
    interval: "month" as const,
    tier: "standard" as const,
    label: "Standard — mensuel",
    monthlyEquivalent: 14.95,
  },
  standard_yearly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY ?? "",
    amount: 149,
    interval: "year" as const,
    tier: "standard" as const,
    label: "Standard — annuel",
    monthlyEquivalent: 12.42,
  },
  premium_monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    amount: 19.95,
    interval: "month" as const,
    tier: "premium" as const,
    label: "Premium — mensuel",
    monthlyEquivalent: 19.95,
  },
  premium_yearly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY ?? "",
    amount: 199,
    interval: "year" as const,
    tier: "premium" as const,
    label: "Premium — annuel",
    monthlyEquivalent: 16.58,
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PLANS;
export type StripeTier = "standard" | "premium";

/** Économie annuelle par tier si l'utilisateur choisit l'annuel.
 *  Calcul = 12 × mensuel − annuel, arrondi à 2 décimales. */
export const YEARLY_SAVINGS_CHF: Record<StripeTier, number> = {
  standard:
    Math.round(
      (STRIPE_PLANS.standard_monthly.amount * 12 -
        STRIPE_PLANS.standard_yearly.amount) *
        100,
    ) / 100,
  premium:
    Math.round(
      (STRIPE_PLANS.premium_monthly.amount * 12 -
        STRIPE_PLANS.premium_yearly.amount) *
        100,
    ) / 100,
};

/**
 * True when Stripe is wired up enough for /api/stripe/checkout to attempt
 * a Checkout Session. Only checks the secret key — the publishable key is
 * reserved for Phase 4 if we mount Stripe.js client-side.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
