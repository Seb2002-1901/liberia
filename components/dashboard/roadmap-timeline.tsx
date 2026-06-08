import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
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
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Phase 5.0 S3 — Roadmap horizontale "Votre avenir, notre feuille
 * de route" (Bloc 2 dashboard).
 *
 * Reproduit fidèlement la maquette : 4 jalons en ligne reliés par
 * chevrons, chaque jalon = icône colorée + caption uppercase +
 * titre + sous-ligne. Lien "Voir toutes les projections →" en haut
 * à droite (pointe vers /plan).
 *
 * Server Component — aucun état. Les milestones viennent de
 * `buildRoadmap` (pur). Le mobile dégrade en pile verticale (D10).
 */

type Translator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

interface RoadmapTimelineProps {
  milestones: RoadmapMilestone[];
}

export async function RoadmapTimeline({ milestones }: RoadmapTimelineProps) {
  const t = (await getTranslations("dashboard.roadmap")) as unknown as Translator;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t("title")}
        </h2>
        <Link
          href={ROUTES.plan}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("seeAllLink")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/*
        Grille desktop : 4 jalons + 3 connecteurs = 7 colonnes.
        Mobile : grid-cols-2 pour 2x2, connecteurs cachés.
      */}
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7 lg:items-stretch">
        {milestones.map((m, i) => (
          <React.Fragment key={m.kind}>
            <Milestone milestone={m} t={t} />
            {i < milestones.length - 1 && <Connector />}
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

  return (
    <li className="rounded-xl border border-border/60 bg-secondary/40 p-4 lg:col-span-1">
      <span
        aria-hidden
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg",
          tone.bg,
          tone.fg,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t(milestone.eyebrowKey)}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {t(milestone.titleKey, milestone.payload)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
        {t(milestone.subtitleKey, milestone.payload)}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Connector chevron between milestones (desktop only)                        */
/* -------------------------------------------------------------------------- */

function Connector() {
  return (
    <li
      aria-hidden
      className="hidden items-center justify-center lg:col-span-1 lg:flex"
    >
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Theming                                                                    */
/* -------------------------------------------------------------------------- */

function iconComponentFor(icon: RoadmapIcon) {
  switch (icon) {
    case "Score":
      return RoundScore;
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

function toneClasses(tone: RoadmapTone): { bg: string; fg: string } {
  switch (tone) {
    case "navy":
      return { bg: "bg-navy/10", fg: "text-navy" };
    case "success":
      return { bg: "bg-success/10", fg: "text-success" };
    case "warning":
      return { bg: "bg-warning/10", fg: "text-warning" };
    case "neutral":
      return { bg: "bg-muted", fg: "text-muted-foreground" };
  }
}

/** Icône custom pour le jalon "Aujourd'hui" (cercle + point central,
 *  évoque un score). */
function RoundScore({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
