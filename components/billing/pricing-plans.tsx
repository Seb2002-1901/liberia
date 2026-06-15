"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import {
  PLANS,
  type PlanTierId,
  type PlanIntervalId,
  type PlanId,
} from "@/lib/constants";
import {
  TRIAL_DAYS,
  YEARLY_SAVINGS_CHF,
  STRIPE_PLANS,
} from "@/lib/stripe/config";
import { getLocaleForLanguage } from "@/lib/locale/languages";
import { cn } from "@/lib/utils";

/**
 * Phase 6 — Pricing UI 2 tiers × 2 intervalles.
 *
 * Affichage : 4 cartes en grille 2×2 sur desktop, 1 colonne en mobile.
 * L'utilisateur voit immédiatement le différentiel Standard ↔ Premium
 * et le différentiel Mensuel ↔ Annuel (avec économie annuelle visible).
 *
 * Notes business (cf. lib/constants/index.ts) :
 *   - Pas de plan gratuit.
 *   - Essai 14 jours, carte requise à l'inscription.
 *   - Aucun prélèvement pendant l'essai. Annulable avant la fin pour
 *     ne rien payer.
 *   - Démo accessible sans compte (/demo) — données non sauvegardées.
 */

type Variant = "marketing" | "in-app";

interface PricingPlansProps {
  variant?: Variant;
  isAuthenticated?: boolean;
  currentPriceId?: string | null;
}

const TIER_ORDER: readonly PlanTierId[] = ["standard", "premium"];
const INTERVAL_ORDER: readonly PlanIntervalId[] = ["monthly", "yearly"];

export function PricingPlans({
  variant = "marketing",
  isAuthenticated = false,
  currentPriceId = null,
}: PricingPlansProps) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
      {TIER_ORDER.map((tier) =>
        INTERVAL_ORDER.map((interval) => {
          const plan = PLANS[tier];
          const sku = plan[interval];
          const planId = sku.id as PlanId;
          return (
            <PlanCard
              key={planId}
              tier={tier}
              interval={interval}
              planId={planId}
              variant={variant}
              isAuthenticated={isAuthenticated}
              isCurrent={isCurrentPlan(planId, currentPriceId)}
            />
          );
        }),
      )}
    </div>
  );
}

function isCurrentPlan(
  planId: PlanId,
  currentPriceId: string | null,
): boolean {
  if (!currentPriceId) return false;
  const expected = STRIPE_PLANS[planId]?.priceId;
  return Boolean(expected) && expected === currentPriceId;
}

function PlanCard({
  tier,
  interval,
  planId,
  variant,
  isAuthenticated,
  isCurrent,
}: {
  tier: PlanTierId;
  interval: PlanIntervalId;
  planId: PlanId;
  variant: Variant;
  isAuthenticated: boolean;
  isCurrent: boolean;
}) {
  const t = useTranslations("app.billing");
  const locale = useLocale();
  const plan = PLANS[tier];
  const sku = plan[interval];
  const isYearly = interval === "yearly";
  // Premium yearly est l'offre la plus attractive (mise en avant gold).
  const isHighlight = tier === "premium" && interval === "yearly";

  // Subscription is billed in CHF for launch (note on the subscription
  // page), but we format the displayed amount in the user's locale for
  // separators (1'234,99 in fr-CH, 1,234.99 in en-US).
  const intlLocale = getLocaleForLanguage(locale);
  const fmt = (n: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 2,
    }).format(n);

  // i18n keys structurées par tier+intervalle :
  //   app.billing.plans.standard.name / .monthly.description /
  //   .features etc.
  const features = t.raw(`plans.${tier}.features`) as string[];
  const tierName = t(`plans.${tier}.name`);
  const intervalLabel = isYearly ? t("perYear") : t("perMonth");
  const intervalSlug = isYearly ? t("intervalYearly") : t("intervalMonthly");
  const description = t(`plans.${tier}.${interval}.description`);
  const badge = isHighlight ? t("plans.recommendedBadge") : undefined;
  const yearlySavings = YEARLY_SAVINGS_CHF[tier];

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-7 backdrop-blur-sm",
        isHighlight
          ? "border-[hsl(var(--gold)/0.4)] bg-gradient-to-br from-[hsl(var(--gold)/0.06)] via-card/40 to-card/40 shadow-[0_30px_80px_-40px_hsl(var(--gold)/0.35)]"
          : "border-border/60 bg-card/40",
      )}
    >
      {(isCurrent || badge) && (
        <Badge
          variant={isCurrent ? "success" : "gold"}
          className="absolute -top-3 right-6"
        >
          {isCurrent ? (
            t("currentBadge")
          ) : (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              {badge}
            </>
          )}
        </Badge>
      )}

      <p className="text-sm font-medium text-muted-foreground">
        {tierName} · {intervalSlug}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">
          {fmt(sku.priceCHF)}
        </span>
        <span className="text-sm text-muted-foreground">/ {intervalLabel}</span>
      </div>
      {isYearly ? (
        <p className="mt-1 text-xs text-[hsl(var(--gold))]">
          {t("yearlySavings", {
            monthly: fmt(sku.monthlyEquivalentCHF),
            savings: fmt(yearlySavings),
          })}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6">
        {isCurrent ? (
          <Button disabled variant="outline" className="w-full">
            {t("activeButton")}
          </Button>
        ) : variant === "in-app" && isAuthenticated ? (
          <CheckoutButton
            planId={planId}
            label={isYearly ? t("ctaStartYearly") : t("ctaStartMonthly")}
            variant={isHighlight ? "gold" : "outline"}
          />
        ) : (
          <Button
            asChild
            variant={isHighlight ? "gold" : "outline"}
            className="w-full"
            size="lg"
          >
            <Link href="/register">
              {t("ctaStartTrial", { days: TRIAL_DAYS })}
            </Link>
          </Button>
        )}
      </div>

      <ul className="mt-7 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                isHighlight
                  ? "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
                  : "bg-secondary text-foreground",
              )}
            >
              <Check className="h-3 w-3" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[11px] text-muted-foreground">
        {t("fineprint", { days: TRIAL_DAYS })}
      </p>
    </div>
  );
}
