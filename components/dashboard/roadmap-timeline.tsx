import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Home,
  Plane,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type {
  RoadmapIcon,
  RoadmapMilestone,
  RoadmapTone,
} from "@/lib/calculations/roadmap-templates";
import { RoadmapConnector } from "@/components/dashboard/roadmap-connector";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3.1 — RoadmapTimeline pixel-perfect maquette dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte parente blanche `p-7 rounded-2xl shadow-card`
 *   - Titre `text-base font-semibold` + lien "Voir toutes les
 *     projections →" bleu primary
 *   - 4 jalons horizontaux reliés par connecteurs SVG dashed-line +
 *     arrow head (RoadmapConnector)
 *   - Chaque jalon : carte intérieure `bg-card border border-border/40
 *     shadow-card p-4 rounded-xl`
 *   - Icônes par jalon dans pastilles 9×9 avec halo coloré :
 *       AUJOURD'HUI : navy (RoundScore avec score)
 *       4 MOIS      : success (Shield)
 *       12 MOIS     : violet (TrendingUp) ← chart-violet maquette stricte
 *       3 ANS       : success (adapté goalType)
 *   - Caption uppercase tracking-[0.2em]
 *   - Animation fade-in au mount
 */

type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

interface RoadmapTimelineProps {
  milestones: RoadmapMilestone[];
}

export async function RoadmapTimeline({ milestones }: RoadmapTimelineProps) {
  const t = (await getTranslations(
    "dashboard.roadmap",
  )) as unknown as Translator;

  return (
    <section className="rounded-2xl border border-border bg-card p-7 shadow-card animate-fade-in">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t("title")}
        </h2>
        <Link
          href={ROUTES.plan}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
        >
          {t("seeAllLink")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/*
        Phase 5.0 S3.1 v2 — flexbox pour donner aux jalons toute la
        largeur disponible. Les connecteurs prennent une place fixe
        (40 px) et fine ; chaque jalon prend `flex-1` = part égale du
        reste. Maquette dashboard.png : jalons larges + lignes
        pointillées fines entre eux.
        Mobile : stack vertical, connecteurs cachés.
      */}
      <ol className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
        {milestones.map((m, i) => (
          <React.Fragment key={m.kind}>
            <Milestone milestone={m} t={t} />
            {i < milestones.length - 1 && <RoadmapConnector />}
          </React.Fragment>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Single milestone (sync — t injecté par le parent)                          */
/* -------------------------------------------------------------------------- */

function Milestone({
  milestone,
  t,
}: {
  milestone: RoadmapMilestone;
  t: Translator;
}) {
  const Icon = iconComponentFor(milestone.icon);
  const tone = toneClasses(milestone.tone);
  // Le jalon AUJOURD'HUI montre le score directement dans le badge.
  const isToday = milestone.kind === "today";
  const todayScore =
    isToday && typeof milestone.payload.score === "number"
      ? (milestone.payload.score as number)
      : null;

  return (
    <li className="rounded-xl border border-border/40 bg-card p-5 shadow-card lg:flex-1 lg:basis-0">
      <span
        aria-hidden
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full",
          tone.bg,
          tone.fg,
          tone.ring,
        )}
      >
        {isToday && todayScore !== null ? (
          <span className="font-display text-xs font-bold tabular-nums">
            {todayScore}
          </span>
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t(milestone.eyebrowKey)}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {t(milestone.titleKey, milestone.payload)}
      </p>
      <p className="mt-1 text-xs leading-[1.55] text-muted-foreground">
        {t(milestone.subtitleKey, milestone.payload)}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Theming                                                                    */
/* -------------------------------------------------------------------------- */

function iconComponentFor(icon: RoadmapIcon) {
  switch (icon) {
    case "Score":
      return Sparkles; // fallback — l'affichage du score remplace l'icône
    case "Shield":
      return Shield;
    case "TrendingUp":
      return TrendingUp;
    case "Home":
      return Home;
    case "Plane":
      return Plane;
    case "Briefcase":
      return Briefcase;
    case "Heart":
      return Heart;
    case "Sparkles":
      return Sparkles;
  }
}

function toneClasses(
  tone: RoadmapTone,
): { bg: string; fg: string; ring: string } {
  switch (tone) {
    case "navy":
      return {
        bg: "bg-navy/10",
        fg: "text-navy",
        ring: "ring-2 ring-navy/15",
      };
    case "success":
      return {
        bg: "bg-success/10",
        fg: "text-success",
        ring: "ring-2 ring-success/15",
      };
    case "warning":
      return {
        bg: "bg-warning/10",
        fg: "text-warning",
        ring: "ring-2 ring-warning/15",
      };
    case "violet":
      // Jalon 12 mois — chart-violet (maquette dashboard.png).
      return {
        bg: "bg-chart-violet/10",
        fg: "text-chart-violet",
        ring: "ring-2 ring-chart-violet/15",
      };
    case "neutral":
      return {
        bg: "bg-muted",
        fg: "text-muted-foreground",
        ring: "",
      };
  }
}
