"use client";

import * as React from "react";
import { ArrowRight, Shield, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { HealthScoreDrawer } from "@/components/dashboard/health-score-drawer";
import type { FirstMissionResult } from "@/lib/calculations/first-mission";
import type { DrawerData } from "@/lib/calculations/health/types";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Carte "Votre priorité actuelle".
 *
 * Reproduit fidèlement la 2ème carte hero de la maquette :
 *   - Carte blanche, eyebrow uppercase
 *   - Icône colorée par priorité (bouclier / éclair / etc.)
 *   - Titre court + sous-ligne contextuelle
 *   - Lien "Voir pourquoi →" qui ouvre le Drawer FHS (D2 validé)
 *
 * Le composant est CLIENT car le clic "Voir pourquoi" ouvre un
 * Drawer interactif. Le moteur de mission (buildFirstMission) reste
 * pur et server-side ; cette carte ne fait que rendre + ouvrir le
 * Drawer existant.
 *
 * Empty state : si firstMission.priority === "none", on rend quand
 * même la carte avec un message rassurant ("Continue ce que tu fais
 * bien"). Aucune fausse alerte.
 */

interface PriorityCardProps {
  mission: FirstMissionResult;
  /** Mois de fonds d'urgence disponibles. Utilisé pour la sous-ligne
   *  contextuelle des priorités liées à la résilience. */
  runwayMonths: number;
  /** Données FHS pour le Drawer "Voir pourquoi". null = pas de
   *  Drawer, on cache le lien (rare — utilisateur sans FHS calculé). */
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
  const { Icon, iconBg, iconColor } = themeForPriority(mission.priority);

  // Sous-ligne contextuelle adaptée à la priorité courante. Évite
  // les "0 mois de sécurité" si la priorité ne porte pas sur la
  // résilience.
  const subline = sublineFor(mission.priority, runwayMonths, t);

  return (
    <>
      <article className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg,
              iconColor,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="font-display text-base font-semibold leading-snug text-foreground">
            {t(`title.${mission.priority}`)}
          </h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{subline}</p>
        {drawerData && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
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
/*  Theming par priorité                                                       */
/* -------------------------------------------------------------------------- */

interface PriorityTheme {
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind bg class for the icon badge. */
  iconBg: string;
  /** Tailwind text color for the icon. */
  iconColor: string;
}

function themeForPriority(priority: FirstMissionResult["priority"]): PriorityTheme {
  switch (priority) {
    case "no_goal":
      return {
        Icon: Sparkles,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      };
    case "low_resilience":
      // Bouclier orange/amber — matche la maquette (priorité
      // "Construire votre fonds d'urgence").
      return {
        Icon: Shield,
        iconBg: "bg-warning/10",
        iconColor: "text-warning",
      };
    case "incomplete_expenses":
      return {
        Icon: Wallet,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      };
    case "fhs_recommendation":
      return {
        Icon: TrendingUp,
        iconBg: "bg-success/10",
        iconColor: "text-success",
      };
    case "none":
      return {
        Icon: Sparkles,
        iconBg: "bg-secondary",
        iconColor: "text-muted-foreground",
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
