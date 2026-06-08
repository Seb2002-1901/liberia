"use client";

import * as React from "react";
import { ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { HealthScoreDrawer } from "@/components/dashboard/health-score-drawer";
import type { DrawerData } from "@/lib/calculations/health/types";
import { buildProgressRing } from "@/lib/ui/svg-charts";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — ScoreCard pixel-perfect maquette dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte navy avec gradient subtil top-right (var(--navy) → 30%)
 *   - Score `text-7xl font-bold` blanc
 *   - "/100" `text-base text-white/50`
 *   - Caption "SCORE DE SANTÉ FINANCIÈRE" `text-[10px] tracking-[0.2em] text-white/70`
 *   - Ring partiel droite 112px, cap-end rond
 *   - Halo blanc/10 blur derrière le ring
 *   - Badge "EN PROGRESSION" en pastille `bg-success/15 rounded-full px-2.5 py-0.5 text-success`
 *   - Padding `p-7`
 *   - Ombre `shadow-card-navy`
 *   - Hover lift `-translate-y-0.5` + transition
 *   - Animation fade-in au mount
 *
 * Click n'importe où → ouvre HealthScoreDrawer (Phase 3.2 intact).
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
  // Phase 5.0 S3.1 v6 — feedback v5 : "cercle légèrement plus
  // grand, halo plus doux et plus diffus". Ring radius 42 → 43,
  // thickness 8.5 → 9. Container repasse à 132. Halo blur-2xl
  // → blur-3xl avec opacité 10 → 12% (plus diffus, plus doux).
  const ring = buildProgressRing(score / 100, {
    cx: 50,
    cy: 50,
    radius: 43,
    thickness: 9,
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
          // Phase 5.0 S3.1 v5 — padding p-7 → p-6 (densité hero).
          "group relative w-full overflow-hidden rounded-2xl p-6 text-left",
          "bg-navy",
          "shadow-card-navy",
          "transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-card-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "animate-fade-in",
        )}
        aria-label={t("ariaOpen", { score })}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
              {t("eyebrow")}
            </p>
            <div className="mt-4 flex items-baseline gap-1.5">
              {/* Phase 5.0 S3.1 v5 — score allégé [88px] → [76px]
                  pour retrouver l'équilibre maquette. */}
              <span className="font-display text-5xl font-bold leading-none tabular-nums text-white lg:text-[76px]">
                {score}
              </span>
              <span className="text-base font-medium text-white/55">
                {t("outOf")}
              </span>
            </div>
            <div className="mt-4 flex items-center">
              <DeltaBadge sign={deltaSign} />
            </div>
            <p className="mt-2 text-xs text-white/75">
              {delta === null
                ? t("deltaUnavailable")
                : delta === 0
                  ? t("deltaStable")
                  : delta > 0
                    ? t("deltaUp", { points: Math.round(delta) })
                    : t("deltaDown", { points: Math.round(Math.abs(delta)) })}
            </p>
          </div>

          {/* Ring + halo. Phase 5.0 S3.1 v6 — container 124 → 132
              (cercle légèrement plus grand), halo opacité 10 → 12%,
              blur-2xl → blur-3xl avec inset -3 → -5 (halo plus
              doux et plus diffus). Drop-shadow glow conservé. */}
          <div
            aria-hidden
            className="relative shrink-0"
            style={{ width: 132, height: 132 }}
          >
            <div className="absolute inset-[-5px] rounded-full bg-white/[0.12] blur-3xl" />
            <svg viewBox="0 0 100 100" className="relative h-full w-full">
              <path
                d={ring.trackD}
                fill="white"
                fillRule="evenodd"
                opacity={0.16}
              />
              {ring.arcD && (
                <path
                  d={ring.arcD}
                  fill="white"
                  style={{ filter: "drop-shadow(0 0 8px rgb(255 255 255 / 0.20))" }}
                />
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
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-success">
        <TrendingUp className="h-3 w-3" />
        {t("up")}
      </span>
    );
  }
  if (sign === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-warning">
        <ArrowUpRight className="h-3 w-3 rotate-90" />
        {t("down")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
      <Minus className="h-3 w-3" />
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
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 animate-fade-in",
        "bg-navy",
        "shadow-card-navy",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {t("eyebrow")}
          </p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="font-display text-5xl font-bold tabular-nums text-white/60">
              —
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-white">
            {t("emptyTitle")}
          </p>
          <p className="mt-2 text-xs text-white/70">{t("emptyBody")}</p>
        </div>

        <div
          aria-hidden
          className="relative shrink-0 opacity-30"
          style={{ width: 112, height: 112 }}
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
