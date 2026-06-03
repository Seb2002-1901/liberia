"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { PLANS } from "@/lib/constants";
import { TRIAL_DAYS, YEARLY_SAVINGS_CHF } from "@/lib/stripe/config";
import { getLocaleForLanguage } from "@/lib/locale/languages";
import { cn } from "@/lib/utils";

type Variant = "marketing" | "in-app";

interface PricingPlansProps {
  variant?: Variant;
  isAuthenticated?: boolean;
  currentPriceId?: string | null;
}

export function PricingPlans({
  variant = "marketing",
  isAuthenticated = false,
  currentPriceId = null,
}: PricingPlansProps) {
  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      <PlanCard
        planKey="monthly"
        plan={PLANS.monthly}
        variant={variant}
        isAuthenticated={isAuthenticated}
        isCurrent={isCurrentPlan("premium_monthly", currentPriceId)}
      />
      <PlanCard
        planKey="yearly"
        plan={PLANS.yearly}
        variant={variant}
        highlight
        isAuthenticated={isAuthenticated}
        isCurrent={isCurrentPlan("premium_yearly", currentPriceId)}
      />
    </div>
  );
}

function isCurrentPlan(
  planId: "premium_monthly" | "premium_yearly",
  currentPriceId: string | null,
): boolean {
  if (!currentPriceId) return false;
  const expected =
    planId === "premium_monthly"
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY;
  return Boolean(expected) && expected === currentPriceId;
}

type PlanKey = "monthly" | "yearly";
type PlanData = (typeof PLANS)["monthly"] | (typeof PLANS)["yearly"];

function PlanCard({
  planKey,
  plan,
  variant,
  highlight,
  isAuthenticated,
  isCurrent,
}: {
  planKey: PlanKey;
  plan: PlanData;
  variant: Variant;
  highlight?: boolean;
  isAuthenticated: boolean;
  isCurrent: boolean;
}) {
  const t = useTranslations("app.billing");
  const locale = useLocale();
  const isYearly = plan.interval === "year";

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

  const features = t.raw(`plans.${planKey}.features`) as string[];
  const badge = planKey === "yearly" ? t("plans.yearly.badge") : undefined;

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-7 backdrop-blur-sm",
        highlight
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
        {t(`plans.${planKey}.name`)}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold">
          {fmt(plan.priceCHF)}
        </span>
        <span className="text-sm text-muted-foreground">
          / {isYearly ? t("perYear") : t("perMonth")}
        </span>
      </div>
      {isYearly ? (
        <p className="mt-1 text-xs text-[hsl(var(--gold))]">
          {t("yearlySavings", {
            monthly: fmt(plan.monthlyEquivalentCHF),
            savings: fmt(YEARLY_SAVINGS_CHF),
          })}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {t(`plans.${planKey}.description`)}
      </p>

      <div className="mt-6">
        {isCurrent ? (
          <Button disabled variant="outline" className="w-full">
            {t("activeButton")}
          </Button>
        ) : variant === "in-app" && isAuthenticated ? (
          <CheckoutButton
            planId={plan.id}
            label={isYearly ? t("ctaStartYearly") : t("ctaStartMonthly")}
            variant={highlight ? "gold" : "outline"}
          />
        ) : (
          <Button
            asChild
            variant={highlight ? "gold" : "outline"}
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
                highlight
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
