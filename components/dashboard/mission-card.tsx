import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { FirstMissionResult } from "@/lib/calculations/first-mission";

/**
 * Phase 5.0 S3.1 — MissionCard pixel-perfect maquette dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card`
 *   - Eyebrow "MISSION DU MOMENT" + petit éclair bleu dans pastille
 *     `bg-primary/10 ring-1 ring-primary/15`
 *   - Titre `text-lg font-semibold leading-snug`
 *   - Sous-ligne contextuelle avec montant suggéré (low_resilience)
 *     calculé déterministiquement depuis monthlyIncome (5%/50/100)
 *   - Bouton bleu plein `size="lg"` plein largeur sur mobile, auto sur sm+
 *   - Padding `p-7`
 *   - Animation fade-in au mount
 *
 * Server Component — aucun état interactif.
 */

interface MissionCardProps {
  mission: FirstMissionResult;
}

export async function MissionCard({ mission }: MissionCardProps) {
  const t = await getTranslations("dashboard.missionCard");
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <Zap className="h-4 w-4" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("eyebrow")}
        </p>
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-foreground">
        {t(`${mission.priority}.title`, mission.payload)}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(`${mission.priority}.subline`, mission.payload)}
      </p>
      <Button
        asChild
        variant="default"
        size="lg"
        className="mt-5 w-full text-sm font-medium sm:w-auto"
      >
        <Link href={mission.ctaHref}>
          {t("cta")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}
