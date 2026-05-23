import type { Metadata } from "next";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqSection } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Commence gratuitement et passe Premium quand tu en sens le besoin. Sans engagement.",
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
            Un prix juste, sans pièges.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Tu peux utiliser LIBERIA gratuitement à vie. Premium débloque l'usage illimité et l'accès anticipé aux fonctions IA à venir.
          </p>
        </div>
      </section>
      <PricingPreview />
      <FaqSection />
    </>
  );
}
