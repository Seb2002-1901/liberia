import type { Metadata } from "next";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqSection } from "@/components/marketing/sections";
import { TRIAL_DAYS } from "@/lib/stripe/config";

export const metadata: Metadata = {
  title: "Tarifs",
  description: `LIBERIA — ${TRIAL_DAYS} jours gratuits puis 14.99 CHF/mois ou 119.99 CHF/an. Annulable à tout moment.`,
};

export default function PricingPage() {
  return (
    <>
      <section className="container py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            Tarification
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Un prix clair. Sans pièges.
          </h1>
          <p className="mt-4 text-muted-foreground">
            {TRIAL_DAYS} jours gratuits pour découvrir LIBERIA. Puis le plan
            que tu choisis (mensuel ou annuel) se déclenche automatiquement.
            Tu peux annuler à tout moment depuis ton espace, sans question.
          </p>
        </div>
      </section>
      <PricingPreview />
      <FaqSection />
    </>
  );
}
