import type { FirstMissionPriority } from "@/lib/calculations/first-mission";
import type { GoalTypeId } from "@/lib/constants";

/**
 * Phase 5.0 S3 — moteur de roadmap horizontale (Priority Engine v1).
 *
 * Cible UX : la maquette dashboard montre 4 jalons horizontaux qui
 * répondent à "que se passe-t-il pour MON projet à 4 mois / 12 mois
 * / 3 ans ?". Le user doit avoir l'impression que l'app comprend
 * son objectif personnel.
 *
 * Approche : templates statiques par `priority` (no_goal /
 * low_resilience / incomplete_expenses / fhs_recommendation / none)
 * + adaptation de l'étape 4 (DANS 3 ANS) au goalType principal de
 * l'utilisateur. Aucune projection numérique inventée — tous les
 * libellés sont des promesses qualitatives.
 *
 * Pure : aucun I/O, aucun appel LLM, déterministe à 100%. Le rendu
 * UI consomme uniquement les `i18nKey` et l'icône.
 */

export type RoadmapMilestoneKind =
  | "today"
  | "fourMonths"
  | "twelveMonths"
  | "threeYears";

/** Mappage des icônes Lucide. Le composant UI fait le `<Icon />`. */
export type RoadmapIcon =
  | "Score"
  | "Shield"
  | "TrendingUp"
  | "Home"
  | "Plane"
  | "Briefcase"
  | "Heart"
  | "Sparkles";

export type RoadmapTone =
  | "navy"
  | "success"
  | "warning"
  | "violet"
  | "neutral";

export interface RoadmapMilestone {
  kind: RoadmapMilestoneKind;
  /** Clé i18n sous dashboard.roadmap.eyebrow.<kind>. */
  eyebrowKey: string;
  /** Clé i18n sous dashboard.roadmap.steps.<priority>.<kind>.title. */
  titleKey: string;
  /** Clé i18n sous dashboard.roadmap.steps.<priority>.<kind>.subtitle. */
  subtitleKey: string;
  /** Payload ICU pour rendre les templates (toujours défini). */
  payload: Record<string, string | number>;
  icon: RoadmapIcon;
  tone: RoadmapTone;
}

export interface BuildRoadmapInput {
  /** Priorité courante de la mission (sortie de buildFirstMission). */
  priority: FirstMissionPriority;
  /** Goal type principal du user (objectif à 3 ans). null si aucun. */
  mainGoalType: GoalTypeId | null;
  /** Score FHS actuel (0-100). null si INSUFFICIENT_DATA. */
  currentScore: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Adaptation de l'étape "DANS 3 ANS" au goalType principal                   */
/* -------------------------------------------------------------------------- */

interface ThreeYearTemplate {
  titleKey: string;
  subtitleKey: string;
  icon: RoadmapIcon;
  tone: RoadmapTone;
}

const THREE_YEAR_BY_GOAL: Record<GoalTypeId, ThreeYearTemplate> = {
  emergency_fund: {
    titleKey: "threeYears.emergency_fund.title",
    subtitleKey: "threeYears.emergency_fund.subtitle",
    icon: "Shield",
    tone: "success",
  },
  debt_payoff: {
    titleKey: "threeYears.debt_payoff.title",
    subtitleKey: "threeYears.debt_payoff.subtitle",
    icon: "Briefcase",
    tone: "success",
  },
  savings: {
    titleKey: "threeYears.savings.title",
    subtitleKey: "threeYears.savings.subtitle",
    icon: "TrendingUp",
    tone: "success",
  },
  purchase: {
    titleKey: "threeYears.purchase.title",
    subtitleKey: "threeYears.purchase.subtitle",
    icon: "Home",
    tone: "success",
  },
  travel: {
    titleKey: "threeYears.travel.title",
    subtitleKey: "threeYears.travel.subtitle",
    icon: "Plane",
    tone: "success",
  },
  increase_income: {
    titleKey: "threeYears.increase_income.title",
    subtitleKey: "threeYears.increase_income.subtitle",
    icon: "TrendingUp",
    tone: "success",
  },
  other: {
    titleKey: "threeYears.other.title",
    subtitleKey: "threeYears.other.subtitle",
    icon: "Sparkles",
    tone: "success",
  },
};

const DEFAULT_THREE_YEAR: ThreeYearTemplate = {
  titleKey: "threeYears.fallback.title",
  subtitleKey: "threeYears.fallback.subtitle",
  icon: "Sparkles",
  tone: "neutral",
};

function threeYearFor(goalType: GoalTypeId | null): ThreeYearTemplate {
  if (!goalType) return DEFAULT_THREE_YEAR;
  return THREE_YEAR_BY_GOAL[goalType] ?? DEFAULT_THREE_YEAR;
}

/* -------------------------------------------------------------------------- */
/*  Builder                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Construit la roadmap 4 jalons à partir de la priorité courante
 * et du goalType principal. L'étape AUJOURD'HUI affiche le score
 * actuel (ou un placeholder si INSUFFICIENT_DATA). Les étapes 4
 * mois / 12 mois portent des promesses qualitatives liées à la
 * priorité courante. L'étape 3 ans s'adapte au goal type.
 */
export function buildRoadmap(input: BuildRoadmapInput): RoadmapMilestone[] {
  const { priority, mainGoalType, currentScore } = input;
  const threeYear = threeYearFor(mainGoalType);

  // Jalon 1 — AUJOURD'HUI. Toujours présent. Score affiché si
  // disponible ; sinon caption "Posez les bases".
  const today: RoadmapMilestone = {
    kind: "today",
    eyebrowKey: "eyebrow.today",
    titleKey:
      currentScore !== null
        ? "today.scoreLabel"
        : "today.gettingStartedTitle",
    subtitleKey:
      currentScore !== null
        ? `steps.${priority}.today.subtitle`
        : "today.gettingStartedSubtitle",
    payload: currentScore !== null ? { score: currentScore } : {},
    icon: "Score",
    tone: "navy",
  };

  // Jalon 2 + 3 — 4 mois et 12 mois pilotés par la priorité courante.
  const fourMonths: RoadmapMilestone = {
    kind: "fourMonths",
    eyebrowKey: "eyebrow.fourMonths",
    titleKey: `steps.${priority}.fourMonths.title`,
    subtitleKey: `steps.${priority}.fourMonths.subtitle`,
    payload: {},
    icon: iconForFourMonths(priority),
    tone: "success",
  };

  const twelveMonths: RoadmapMilestone = {
    kind: "twelveMonths",
    eyebrowKey: "eyebrow.twelveMonths",
    titleKey: `steps.${priority}.twelveMonths.title`,
    subtitleKey: `steps.${priority}.twelveMonths.subtitle`,
    payload: {},
    icon: iconForTwelveMonths(priority),
    // Phase 5.0 S3.1 — tone violet pour le jalon 12 mois (maquette
    // dashboard.png montre un icône line-chart violet, pas orange).
    // Token --chart-violet ajouté commit 1.
    tone: "violet",
  };

  // Jalon 4 — 3 ans. Adapté au goalType principal.
  const threeYears: RoadmapMilestone = {
    kind: "threeYears",
    eyebrowKey: "eyebrow.threeYears",
    titleKey: threeYear.titleKey,
    subtitleKey: threeYear.subtitleKey,
    payload: {},
    icon: threeYear.icon,
    tone: threeYear.tone,
  };

  return [today, fourMonths, twelveMonths, threeYears];
}

/* -------------------------------------------------------------------------- */
/*  Icon picking — par priorité                                                */
/* -------------------------------------------------------------------------- */

function iconForFourMonths(priority: FirstMissionPriority): RoadmapIcon {
  switch (priority) {
    case "no_goal":
      return "Sparkles";
    case "low_resilience":
      return "Shield";
    case "incomplete_expenses":
      return "Briefcase";
    case "fhs_recommendation":
      return "TrendingUp";
    case "none":
      return "Heart";
  }
}

function iconForTwelveMonths(priority: FirstMissionPriority): RoadmapIcon {
  switch (priority) {
    case "no_goal":
      return "TrendingUp";
    case "low_resilience":
      return "TrendingUp";
    case "incomplete_expenses":
      return "TrendingUp";
    case "fhs_recommendation":
      return "Sparkles";
    case "none":
      return "TrendingUp";
  }
}
