import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3.1 — TalkToAdvisorCard pixel-perfect maquette
 * dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-7`
 *   - Icône chat dans cercle bleu pâle 12×12 avec **halo bleu diffus**
 *     `ring-2 ring-primary/15 shadow-halo-primary`
 *   - Titre `text-lg lg:text-xl font-semibold`
 *   - Sous-ligne muted
 *   - Bouton bleu plein `size="lg"` "Démarrer une conversation →"
 *   - Animation fade-in au mount
 *
 * Cette carte ferme le dashboard (Bloc 5). Pattern transversal
 * Phase 5.0 : le coach jamais à plus d'un clic.
 */

export async function TalkToAdvisorCard() {
  const t = await getTranslations("dashboard.talkToAdvisor");
  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-card animate-fade-in">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/15 shadow-halo-primary"
          >
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground lg:text-xl">
              {t("title")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("body")}</p>
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
