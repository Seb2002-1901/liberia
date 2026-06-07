import type { HealthRecommendation } from "@/lib/calculations/health/types";

/**
 * Phase 4.0 J4 — moteur pur de "Mission du moment" pour le J0.
 *
 * Affiché juste sous le Ring sur le dashboard, ce composant crée
 * l'effet "wow" en 60s en disant au user CE QU'IL DOIT FAIRE
 * ENSUITE. Il ne RECALCULE rien — il consomme uniquement des
 * primitives déjà calculées par Phase 3.2 (FHS, completeness,
 * recommendation) et des champs FinanceData (goals, savings).
 *
 * Hiérarchie de priorité (dans l'ordre, première condition qui matche
 * gagne) :
 *   A. Aucun objectif actif → créer un premier objectif
 *   B. Résilience faible (pas de coussin) → constituer un coussin
 *   C. Dépenses majeures incomplètes → compléter les charges
 *   D. Recommandation FHS dispo → la suivre
 *   E. Rien à faire → mission "optimisation continue"
 *
 * Tout est piloté par i18n keys + payload. Le composant rend les
 * 4 chunks (titre, why, impact, cta) sans logique métier.
 */

export type FirstMissionPriority =
  | "no_goal"
  | "low_resilience"
  | "incomplete_expenses"
  | "fhs_recommendation"
  | "none";

export interface FirstMissionResult {
  priority: FirstMissionPriority;
  /** Clé i18n sous dashboard.firstMission.<priority>.title */
  titleKey: string;
  /** Idem .why */
  whyKey: string;
  /** Idem .impact (peut inclure une référence à estimatedGain) */
  impactKey: string;
  /** Idem .cta */
  ctaKey: string;
  /** Route Next.js cible (jamais externe). */
  ctaHref: string;
  /** Payload ICU pour le rendu des templates i18n. Toujours défini
   *  (au minimum {}), JAMAIS undefined — évite les crashes runtime
   *  sur next-intl strict. */
  payload: Record<string, string | number>;
}

export interface BuildFirstMissionInput {
  /** Objectifs actifs (non complétés et non archivés). */
  goalsCount: number;
  /** Runway courante en mois — déjà calculée par calculateRunway. */
  runwayMonths: number;
  /** current_savings > 0 ? Champ stocké dans financial_profile. */
  hasCurrentSavings: boolean;
  /** Nombre d'aires majeures filled (0-5).
   *  Source : completeness.detected ∩ MAJOR_AREAS. */
  filledMajorAreasCount: number;
  /** Première aire majeure manquante, ou null si toutes filled.
   *  Source : completeness.missing.filter(major)[0]?.area. */
  missingMajorArea: string | null;
  /** Recommandation Phase 3.2. null si confidence INSUFFICIENT_DATA
   *  ou si tous les axes sont LOW. */
  recommendation: HealthRecommendation | null;
}

/* -------------------------------------------------------------------------- */
/*  Constantes seuils                                                          */
/* -------------------------------------------------------------------------- */

/** En-dessous, on considère que l'utilisateur n'a pas de coussin
 *  significatif et doit le construire EN PREMIER (priorité B). */
const RESILIENCE_THRESHOLD_MONTHS = 1;

/** En-dessous, on considère le profil incomplet et on demande à
 *  l'utilisateur de finir de saisir ses charges majeures. */
const COMPLETE_PROFILE_THRESHOLD_AREAS = 4;

/* -------------------------------------------------------------------------- */
/*  Builder                                                                    */
/* -------------------------------------------------------------------------- */

export function buildFirstMission(
  input: BuildFirstMissionInput,
): FirstMissionResult {
  // A. Aucun objectif actif.
  //    Sans objectif, le user n'a aucune raison de revenir. Lui faire
  //    créer un cap = engagement instantané.
  if (input.goalsCount === 0) {
    return {
      priority: "no_goal",
      titleKey: "no_goal.title",
      whyKey: "no_goal.why",
      impactKey: "no_goal.impact",
      ctaKey: "no_goal.cta",
      ctaHref: "/goals",
      payload: {},
    };
  }

  // B. Résilience faible : pas de savings du tout OU runway < 1 mois.
  //    C'est le palier de sécurité avant tout investissement.
  if (!input.hasCurrentSavings || input.runwayMonths < RESILIENCE_THRESHOLD_MONTHS) {
    const runwayRounded =
      Number.isFinite(input.runwayMonths) ? round1(input.runwayMonths) : 0;
    return {
      priority: "low_resilience",
      titleKey: "low_resilience.title",
      whyKey: "low_resilience.why",
      impactKey: "low_resilience.impact",
      ctaKey: "low_resilience.cta",
      ctaHref: "/coach",
      payload: { runwayMonths: runwayRounded },
    };
  }

  // C. Dépenses incomplètes : moins de 4 catégories majeures filled.
  //    Compléter les charges peuple le FHS et le coach instantanément.
  if (input.filledMajorAreasCount < COMPLETE_PROFILE_THRESHOLD_AREAS) {
    const missing = input.missingMajorArea ?? "income";
    return {
      priority: "incomplete_expenses",
      titleKey: "incomplete_expenses.title",
      whyKey: "incomplete_expenses.why",
      impactKey: "incomplete_expenses.impact",
      ctaKey: "incomplete_expenses.cta",
      ctaHref: "/expenses",
      payload: {
        missingArea: missing,
        filledCount: input.filledMajorAreasCount,
      },
    };
  }

  // D. Recommandation FHS disponible : on la suit comme mission
  //    de premier ordre. La recommandation embarque déjà sa
  //    propre titleKey + payload + estimatedGain.
  if (input.recommendation) {
    const r = input.recommendation;
    return {
      priority: "fhs_recommendation",
      titleKey: "fhs_recommendation.title",
      whyKey: "fhs_recommendation.why",
      impactKey:
        r.estimatedGain && r.estimatedGain > 0
          ? "fhs_recommendation.impactWithGain"
          : "fhs_recommendation.impact",
      ctaKey: "fhs_recommendation.cta",
      ctaHref: "/coach",
      payload: {
        // On expose la recommandation au composant via le payload
        // pour qu'il puisse afficher le label de l'axe + le gain
        // estimé sans avoir besoin de re-fetcher.
        targetAxis: r.targetAxis,
        recommendationTitle: r.titleKey,
        estimatedGain: r.estimatedGain ?? 0,
      },
    };
  }

  // E. Rien de critique. Mission douce d'optimisation continue —
  //    on ne laisse JAMAIS le dashboard sans mission affichée
  //    (anti vide).
  return {
    priority: "none",
    titleKey: "none.title",
    whyKey: "none.why",
    impactKey: "none.impact",
    ctaKey: "none.cta",
    ctaHref: "/coach",
    payload: {},
  };
}

/* -------------------------------------------------------------------------- */
/*  Tiny utils                                                                 */
/* -------------------------------------------------------------------------- */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
