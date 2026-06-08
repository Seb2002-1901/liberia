"use client";

import * as React from "react";
import { ArrowRight, Shield, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { HealthScoreDrawer } from "@/components/dashboard/health-score-drawer";
import type { FirstMissionResult } from "@/lib/calculations/first-mission";
import type { DrawerData } from "@/lib/calculations/health/types";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — PriorityCard pixel-perfect maquette dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card`
 *   - Caption uppercase tracking-[0.2em] muted
 *   - Icône bouclier coral (chart-coral) dans pastille `bg-chart-coral/10 ring-1 ring-chart-coral/15`
 *   - Titre `text-lg font-semibold leading-snug`
 *   - Sous-ligne contextuelle muted
 *   - Lien "Voir pourquoi →" bleu primary, underline on hover
 *   - Padding `p-7`
 *   - Animation fade-in au mount
 *
 * Clic "Voir pourquoi" → ouvre HealthScoreDrawer (Phase 3.2 intact).
 */

interface PriorityCardProps {
  mission: FirstMissionResult;
  runwayMonths: number;
  drawerData: DrawerData | null;
  currency: string;
  isDemo?: boolean;
}

export function PriorityCard({
  mission,
  runwayMonths,
  drawerData,
  currency,
  isDemo = false,
}: PriorityCardProps) {
  const t = useTranslations("dashboard.priorityCard");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { Icon, iconBg, iconColor, iconRing } = themeForPriority(mission.priority);
  const subline = sublineFor(mission.priority, runwayMonths, t);

  return (
    <>
      <article className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg,
              iconColor,
              iconRing,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {t(`title.${mission.priority}`)}
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{subline}</p>
        {drawerData && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {t("whyLink")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </article>

      {drawerData && (
        <HealthScoreDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          data={drawerData}
          currency={currency}
          isDemo={isDemo}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Theming par priorité — palette stricte maquette                            */
/* -------------------------------------------------------------------------- */

interface PriorityTheme {
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  iconRing: string;
}

function themeForPriority(priority: FirstMissionResult["priority"]): PriorityTheme {
  switch (priority) {
    case "no_goal":
      return {
        Icon: Sparkles,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        iconRing: "ring-1 ring-primary/15",
      };
    case "low_resilience":
      // Bouclier coral — maquette dashboard.png montre une teinte
      // coral chaude (pas warning jaune) pour la priorité "fonds
      // d'urgence". Token chart-coral ajouté S3.1 commit 1.
      return {
        Icon: Shield,
        iconBg: "bg-chart-coral/10",
        iconColor: "text-chart-coral",
        iconRing: "ring-1 ring-chart-coral/15",
      };
    case "incomplete_expenses":
      return {
        Icon: Wallet,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        iconRing: "ring-1 ring-primary/15",
      };
    case "fhs_recommendation":
      return {
        Icon: TrendingUp,
        iconBg: "bg-success/10",
        iconColor: "text-success",
        iconRing: "ring-1 ring-success/15",
      };
    case "none":
      return {
        Icon: Sparkles,
        iconBg: "bg-secondary",
        iconColor: "text-muted-foreground",
        iconRing: "",
      };
  }
}

function sublineFor(
  priority: FirstMissionResult["priority"],
  runwayMonths: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (priority) {
    case "low_resilience": {
      const rounded = Number.isFinite(runwayMonths)
        ? Math.round(runwayMonths * 10) / 10
        : 0;
      return t("subline.low_resilience", { months: rounded });
    }
    case "no_goal":
      return t("subline.no_goal");
    case "incomplete_expenses":
      return t("subline.incomplete_expenses");
    case "fhs_recommendation":
      return t("subline.fhs_recommendation");
    case "none":
      return t("subline.none");
  }
}
