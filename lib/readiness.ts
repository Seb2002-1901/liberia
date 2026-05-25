import "server-only";

/**
 * Pre-launch readiness diagnostics.
 *
 * Used by the admin dashboard to surface which integrations are wired
 * up and which are still stubbed. Reads `process.env` boolean-style
 * (key present + non-empty) — never echoes the values themselves.
 *
 * Privacy / security rules:
 *  - never return secret values, only presence flags
 *  - never log keys, even at debug level
 *  - server-only by design (admin surface)
 */

export type IntegrationStatus = "required" | "recommended" | "optional";

export type IntegrationCheck = {
  /** Stable id used by callers + tests. */
  id: string;
  /** UI label. */
  label: string;
  /** Stability of LIBERIA without this integration. */
  status: IntegrationStatus;
  /** True when the integration is fully wired in env. */
  ok: boolean;
  /** Short one-line hint for the operator when not OK. */
  hint?: string;
};

export type ReadinessSummary = {
  /** True when every `required` integration is OK. */
  productionReady: boolean;
  /** Per-integration result. */
  checks: IntegrationCheck[];
  /** Convenience aggregate counts. */
  counts: {
    ok: number;
    missingRequired: number;
    missingRecommended: number;
    missingOptional: number;
  };
};

function envPresent(...keys: string[]): boolean {
  return keys.every(
    (k) => typeof process.env[k] === "string" && process.env[k]!.length > 0,
  );
}

/**
 * Aggregate readiness check. Pure over `process.env`. Used by the
 * admin dashboard + future health-check endpoint if needed.
 */
export function getReadinessSummary(): ReadinessSummary {
  const checks: IntegrationCheck[] = [
    {
      id: "app_url",
      label: "URL publique de l'application",
      status: "required",
      ok: envPresent("NEXT_PUBLIC_APP_URL"),
      hint: "Définis NEXT_PUBLIC_APP_URL — Stripe redirects + emails + sitemap en dépendent.",
    },
    {
      id: "supabase",
      label: "Supabase (auth + base de données)",
      status: "required",
      ok: envPresent("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      hint: "Sans Supabase, l'authentification et la persistance ne fonctionnent pas.",
    },
    {
      id: "supabase_admin",
      label: "Supabase service-role (webhook + admin)",
      status: "required",
      ok: envPresent("SUPABASE_SERVICE_ROLE_KEY"),
      hint: "Requis pour le webhook Stripe + l'écriture des réponses de l'assistant.",
    },
    {
      id: "stripe",
      label: "Stripe (paiement + abonnement)",
      status: "required",
      ok: envPresent(
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY",
        "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY",
      ),
      hint: "Configure les 4 variables Stripe avant ouverture du paiement live.",
    },
    {
      id: "anthropic",
      label: "Anthropic (coach IA premium)",
      status: "recommended",
      ok: envPresent("ANTHROPIC_API_KEY"),
      hint: "Sans clé, l'assistant utilise le fallback local — fonctionnel mais moins riche.",
    },
    {
      id: "resend",
      label: "Resend (emails sortants)",
      status: "recommended",
      ok: envPresent("RESEND_API_KEY"),
      hint: "Sans Resend, les emails sont silencieusement no-op'és.",
    },
    {
      id: "cron",
      label: "Cron secret (récap hebdo)",
      status: "recommended",
      ok: envPresent("CRON_SECRET"),
      hint: "Vercel Cron définit automatiquement CRON_SECRET en prod — sinon l'endpoint cron renvoie 503.",
    },
    {
      id: "upstash",
      label: "Upstash Redis (rate-limit)",
      status: "optional",
      ok: envPresent("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"),
      hint: "Sans Upstash, le rate-limit fail-open silencieusement (acceptable en dev).",
    },
    {
      id: "sentry",
      label: "Sentry (observabilité)",
      status: "optional",
      ok: envPresent("NEXT_PUBLIC_SENTRY_DSN") || envPresent("SENTRY_DSN"),
      hint: "Recommandé pour capturer les erreurs runtime en production.",
    },
  ];

  const counts = {
    ok: checks.filter((c) => c.ok).length,
    missingRequired: checks.filter((c) => c.status === "required" && !c.ok).length,
    missingRecommended: checks.filter((c) => c.status === "recommended" && !c.ok)
      .length,
    missingOptional: checks.filter((c) => c.status === "optional" && !c.ok).length,
  };

  return {
    productionReady: counts.missingRequired === 0,
    checks,
    counts,
  };
}
