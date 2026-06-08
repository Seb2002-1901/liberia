import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { FirstMissionResult } from "@/lib/calculations/first-mission";

/**
 * Phase 5.0 S3 — Carte "Mission du moment" (3ème carte hero).
 *
 * Reproduit la maquette : eyebrow "MISSION DU MOMENT" avec icône
 * éclair, titre fort de la mission, sous-ligne courte, bouton
 * primary plein "Agir maintenant" qui pointe vers `mission.ctaHref`.
 *
 * Server Component — aucun état interactif. Le composant precedent
 * (FirstSessionMissionCard) verbose est archivé dans _archive/.
 *
 * Le contenu i18n vit sous dashboard.missionCard.{priority}.* avec
 * payload (runwayMonths, missingArea, etc.) hérité de
 * buildFirstMission.
 */

interface MissionCardProps {
  mission: FirstMissionResult;
}

export async function MissionCard({ mission }: MissionCardProps) {
  const t = await getTranslations("dashboard.missionCard");
  return (
    <article className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Zap className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("eyebrow")}
        </p>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold leading-snug text-foreground">
        {t(`${mission.priority}.title`, mission.payload)}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(`${mission.priority}.subline`, mission.payload)}
      </p>
      <Button asChild variant="default" size="sm" className="mt-4 w-full sm:w-auto">
        <Link href={mission.ctaHref}>
          {t("cta")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </article>
  );
}
