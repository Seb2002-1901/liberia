import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3.1 v7 — TalkToAdvisorCard pixel-perfect maquette
 * dashboard.png, densité reconstruction.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-4` (vs p-7 v6)
 *   - Icône chat dans cercle bleu pâle h-10 (vs h-12 v6) avec
 *     halo `ring-2 ring-primary/15 shadow-halo-primary`
 *   - Titre `text-base font-semibold` (vs text-lg/xl v6)
 *   - Sous-ligne muted
 *   - Bouton bleu plein `size="default"` (vs size="lg" v6)
 *   - Animation fade-in au mount
 */

export async function TalkToAdvisorCard() {
  const t = await getTranslations("dashboard.talkToAdvisor");
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/15 shadow-halo-primary"
          >
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
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
