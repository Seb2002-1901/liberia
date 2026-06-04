import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqSection } from "@/components/marketing/sections";
import { TRIAL_DAYS } from "@/lib/stripe/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.pricingPage.metadata");
  return {
    title: t("title"),
    description: t("description", { days: TRIAL_DAYS }),
  };
}

export default async function PricingPage() {
  const t = await getTranslations("marketing.pricingPage");
  return (
    <>
      <section className="container py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {t("subtitle", { days: TRIAL_DAYS })}
          </p>
        </div>
      </section>
      <PricingPreview />
      <FaqSection />
    </>
  );
}
