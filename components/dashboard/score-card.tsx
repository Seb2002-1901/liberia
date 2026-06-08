"use client";

import * as React from "react";
import { ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { HealthScoreDrawer } from "@/components/dashboard/health-score-drawer";
import type { DrawerData } from "@/lib/calculations/health/types";
import { buildProgressRing } from "@/lib/ui/svg-charts";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Carte hero du score (navy + ring partiel à droite).
 *
 * Reproduit fidèlement le bloc gauche de la maquette dashboard.png :
 *   - Carte fond navy (token --navy)
 *   - "SCORE DE SANTÉ FINANCIÈRE" caption blanche tracking-wide
 *   - "46" grand + "/100" petit
 *   - Ring blanc partiel à droite (rempli au prorata du score)
 *   - "↗ EN PROGRESSION" green si delta > 0
 *   - "+6 pts depuis la semaine dernière" sous-ligne
 *
 * Click n'importe où sur la carte → ouvre le Drawer FHS (D2 validé).
 * Le Drawer est le même composant qu'avant (Phase 3.2) — zéro
 * modification du moteur FHS.
 *
 * Empty state : si drawerData = null (INSUFFICIENT_DATA), on
 * affiche la carte navy quand même avec un ring grisé + "Score
 * en construction" + invitation à compléter le profil. Aucune
 * valeur fake.
 */

interface ScoreCardProps {
  data: DrawerData | null;
  currency: string;
  isDemo?: boolean;
}

export function ScoreCard({ data, currency, isDemo = false }: ScoreCardProps) {
  const t = useTranslations("dashboard.scoreCard");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (!data) {
    return <EmptyScoreCard />;
  }

  const score = data.score.display;
  const ring = buildProgressRing(score / 100, {
    cx: 50,
    cy: 50,
    radius: 42,
    thickness: 8,
  });
  const delta = data.delta?.netDelta ?? null;
  const deltaSign: "up" | "down" | "flat" =
    delta === null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl bg-navy p-6 text-left",
          "transition-shadow duration-200",
          "hover:shadow-[0_10px_30px_-12px_hsl(var(--navy)/0.5)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        aria-label={t("ariaOpen", { score })}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {t("eyebrow")}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-semibold text-white tabular-nums">
                {score}
              </span>
              <span className="text-base font-medium text-white/60">
                {t("outOf")}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <DeltaBadge sign={deltaSign} />
            </div>
            <p className="mt-1.5 text-xs text-white/70">
              {delta === null
                ? t("deltaUnavailable")
                : delta === 0
                  ? t("deltaStable")
                  : delta > 0
                    ? t("deltaUp", { points: Math.round(delta) })
                    : t("deltaDown", { points: Math.round(Math.abs(delta)) })}
            </p>
          </div>

          {/* Ring partiel — SVG natif, palette navy/white */}
          <div
            aria-hidden
            className="relative shrink-0"
            style={{ width: 96, height: 96 }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {/* Track : anneau blanc translucide */}
              <path
                d={ring.trackD}
                fill="white"
                fillRule="evenodd"
                opacity={0.12}
              />
              {/* Arc de progression : blanc plein */}
              {ring.arcD && (
                <path d={ring.arcD} fill="white" />
              )}
            </svg>
          </div>
        </div>
      </button>

      <HealthScoreDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={data}
        currency={currency}
        isDemo={isDemo}
      />
    </>
  );
}

function DeltaBadge({ sign }: { sign: "up" | "down" | "flat" }) {
  const t = useTranslations("dashboard.scoreCard.delta");
  if (sign === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <TrendingUp className="h-3.5 w-3.5" />
        {t("up")}
      </span>
    );
  }
  if (sign === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <ArrowUpRight className="h-3.5 w-3.5 rotate-90" />
        {t("down")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-white/60">
      <Minus className="h-3.5 w-3.5" />
      {t("stable")}
    </span>
  );
}

/**
 * Empty state — drawerData null (utilisateur sans assez de données
 * pour calculer le FHS). Pas de score, pas de delta. Ring grisé +
 * invitation pédagogique.
 */
function EmptyScoreCard() {
  const t = useTranslations("dashboard.scoreCard");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {t("eyebrow")}
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold text-white/60 tabular-nums">
              —
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-white">
            {t("emptyTitle")}
          </p>
          <p className="mt-1.5 text-xs text-white/70">{t("emptyBody")}</p>
        </div>

        <div
          aria-hidden
          className="relative shrink-0 opacity-30"
          style={{ width: 96, height: 96 }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <path
              d={buildProgressRing(0).trackD}
              fill="white"
              fillRule="evenodd"
              opacity={0.2}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
