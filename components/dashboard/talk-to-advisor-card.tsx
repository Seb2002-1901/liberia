import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3.1 v9 — TalkToAdvisorCard compressé strict maquette.
 *
 * Mesures pixel maquette dashboard.png : carte Coach CTA = ~49 px
 * de hauteur. Cible à atteindre via :
 *   - p-3 (vs p-5 v8 = 8 px gagnés)
 *   - Icône h-9 w-9 (vs h-10)
 *   - Bouton size="default" (vs size="lg" v8)
 *   - Spacing interne mt-0 (titre + sous-ligne dans même bloc)
 */

export async function TalkToAdvisorCard() {
  const t = await getTranslations("dashboard.talkToAdvisor");
  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-card animate-fade-in">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/15"
          >
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">
              {t("title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("body")}</p>
          </div>
        </div>
        <Button
          asChild
          variant="default"
          size="default"
          className="w-full sm:w-auto"
        >
          <Link href={ROUTES.coach}>
            {t("cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
