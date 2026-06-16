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
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in">
      <header className="mb-4 flex items-baseline justify-between gap-4">
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
        Phase 5.0 S3.1 v5 — feedback v4 :
          desktop : timeline plus dense, plus intégrée
          mobile  : SCROLL HORIZONTAL natif iOS (snap), pas 4 cartes
                    énormes empilées

        Mobile  : flex overflow-x-auto snap-x snap-mandatory,
                  chaque jalon min-w-[72%] snap-start,
                  -mx-6 px-6 pour overflow visuel bord-à-bord
        Desktop : flex-row classique, jalons flex-1, connecteurs
                  visibles. lg:overflow-visible pour annuler le
                  scroll mobile.
      */}
      <ol className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 lg:mx-0 lg:snap-none lg:gap-0 lg:overflow-visible lg:px-0">
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
    // Phase 5.0 S3.1 v8 — retrait du shadow et border allégé.
    // Maquette : les milestones sont des blocs intégrés à la carte
    // parente, pas des sous-cartes ombrées. border-border/30 +
    // pas d'ombre = look unifié "timeline" plutôt que "card-in-card".
    <li className="flex min-w-[72%] shrink-0 snap-start flex-col justify-center rounded-xl border border-border/30 bg-card p-3 lg:min-w-0 lg:shrink lg:snap-align-none lg:flex-1 lg:basis-0">
      {/* Phase 5.0 S3.1 v7 — densité : badge h-10 → h-9, icon h-4
          conservé. Score today text-base → text-sm font-bold.
          Ring today [2.5px] → [2px] (cercle visible mais discret). */}
      <span
        aria-hidden
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          tone.bg,
          tone.fg,
          isToday ? "ring-2 ring-navy/20" : tone.ring,
        )}
      >
        {isToday && todayScore !== null ? (
          <span className="font-display text-sm font-bold tabular-nums">
            {todayScore}
          </span>
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t(milestone.eyebrowKey)}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
        {t(milestone.titleKey, milestone.payload)}
      </p>
      <p className="mt-0.5 text-xs leading-[1.45] text-muted-foreground">
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
