import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { ROUTES } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/stripe/config";

export async function PricingPreview() {
  const t = await getTranslations("marketing.pricingPreview");
  return (
    <section id="pricing" className="border-t border-border/60">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title", { days: TRIAL_DAYS })}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-12">
          <PricingPlans variant="marketing" />
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.pricing}>{t("seeAll")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
