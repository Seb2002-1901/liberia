import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3 — Carte CTA Coach (Bloc 5, pied de dashboard).
 *
 * Reproduit la maquette : carte large blanche, icône chat bleue
 * cerclée à gauche, titre + sous-ligne, bouton primary plein
 * "Démarrer une conversation →" à droite.
 *
 * Server Component — aucun état. Lien direct vers /coach.
 *
 * Cette carte ferme chaque page applicative — pattern transversal
 * Phase 5.0 (le coach n'est jamais à plus d'un clic, voir
 * docs/design-system/MOCKUPS_REFERENCE.md).
 */

export async function TalkToAdvisorCard() {
  const t = await getTranslations("dashboard.talkToAdvisor");
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              {t("title")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("body")}
            </p>
          </div>
        </div>
        <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
          <Link href={ROUTES.coach}>
            {t("cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
