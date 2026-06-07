import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { FirstMissionResult } from "@/lib/calculations/first-mission";

interface FirstSessionMissionCardProps {
  mission: FirstMissionResult;
}

/**
 * Phase 4.0 J4 — carte "Mission du moment".
 *
 * Affichée directement sous la rangée Ring + AdvisorCard. Son rôle :
 * dire au user CE QU'IL DOIT FAIRE en moins de 60 secondes après
 * l'onboarding. Aucun calcul ici — tout vient du moteur pur
 * buildFirstMission. Le composant rend titre / why / impact / CTA
 * via i18n + payload, et un seul lien sortant.
 *
 * Server Component : pas de state, pas d'interaction côté client.
 * Le clic CTA navigue vers la route stockée dans mission.ctaHref.
 */
export async function FirstSessionMissionCard({
  mission,
}: FirstSessionMissionCardProps) {
  const t = await getTranslations("dashboard.firstMission");

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.4)] bg-gradient-to-br from-[hsl(var(--gold)/0.08)] via-card/40 to-card/40 p-5 shadow-[0_20px_60px_-30px_hsl(var(--gold)/0.3)] sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
        >
          <Compass className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              {t("label")}
            </p>
            <h2 className="text-base font-semibold leading-snug sm:text-lg">
              {t(`${mission.priority}.title`, mission.payload)}
            </h2>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground/80">
                {t("whyLabel")}
              </span>{" "}
              {t(`${mission.priority}.why`, mission.payload)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">
                {t("impactLabel")}
              </span>{" "}
              {t(mission.impactKey, mission.payload)}
            </p>
          </div>

          <div className="pt-1">
            <Button asChild variant="gold" size="sm">
              <Link href={mission.ctaHref}>
                {t(`${mission.priority}.cta`)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
