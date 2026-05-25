import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { ROUTES } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/stripe/config";

export function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-border/60">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
            Tarifs
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {TRIAL_DAYS} jours gratuits. Puis l'abonnement de ton choix.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Carte requise pour démarrer. Renouvellement automatique après l'essai. Annulable à tout moment.
          </p>
        </div>

        <div className="mt-12">
          <PricingPlans variant="marketing" />
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.pricing}>Voir toutes les fonctionnalités →</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
