import type {
  AxisId,
  AxisResult,
  Band,
  Confidence,
  DrawerData,
  HealthRecommendation,
  TimelineEvent,
} from "@/lib/calculations/health/types";
import { AXIS_ORDER } from "@/lib/calculations/health/constants";

/**
 * Phase 3.2 — render the Financial Health Score as a deterministic
 * FR markdown block the coach reads as one of its system context
 * sections. The strings here are FROZEN — same vocabulary the
 * dashboard surfaces to the user, so the coach never speaks a
 * different number than the ring shows.
 *
 * Pure : input = DrawerData, output = string. No I/O, no clock.
 *
 * Called from buildFinanceContext(financeData, { drawerData }). When
 * drawerData is null/undefined the section is OMITTED altogether
 * (the coach knows then to fall back to the legacy stability score).
 */
export function renderHealthSection(drawer: DrawerData): string {
  const { score, delta, momentum, recommendation } = drawer;
  const lines: string[] = [];

  lines.push("# Financial Health Score");
  // Phase 3.3.1 — when confidence is INSUFFICIENT_DATA the band label
  // ("En construction", "Solide"…) is not significant : the score
  // exists but the qualitative tier doesn't yet. We replace it with
  // "bande non significative — lecture provisoire" to avoid feeding
  // the coach a label it might quote as if it were a stable verdict.
  if (score.confidence === "INSUFFICIENT_DATA") {
    lines.push(
      `Score affiché : ${score.display}/100 (bande non significative — lecture provisoire, ne pas citer le nom de bande)`,
    );
  } else {
    lines.push(
      `Score affiché : ${score.display}/100 (bande : ${bandLabel(score.band)})`,
    );
  }
  lines.push(`Confiance : ${confidenceLabel(score.confidence)}`);
  if (score.confidence === "INSUFFICIENT_DATA") {
    lines.push(
      "Lecture provisoire : ne pas tirer de conclusion forte sur ce score, ne pas citer la bande par son nom, demander d'abord les informations manquantes.",
    );
  }

  // Delta line — sealed week-to-week move.
  if (delta && score.previousScore !== null) {
    const deltaText =
      delta.netDelta > 0
        ? `+${delta.netDelta}`
        : delta.netDelta < 0
          ? `${delta.netDelta}`
          : "stable";
    lines.push(
      `Évolution vs semaine précédente (${delta.fromWeek} → ${delta.toWeek}) : ${deltaText}`,
    );
    const reasons = delta.contributors
      .slice(0, 3)
      .map((c) => `${signedPoints(c.deltaPoints)} ${axisLabel(c.axis)} — ${renderReason(c.reasonKey, c.payload)}`)
      .join(" ; ");
    if (reasons) lines.push(`Principaux contributeurs : ${reasons}`);
  } else {
    lines.push("Première semaine — pas encore de delta hebdomadaire.");
  }

  // Momentum line
  if (momentum) {
    lines.push(
      `Momentum sur ${momentum.windowSize} semaines : ${directionLabel(momentum.direction)} ${strengthLabel(momentum.strength)} (delta ${signedPoints(momentum.delta4Weeks)} sur la fenêtre)`,
    );
  }

  // Weakest axis with at least MEDIUM confidence
  const weakest = pickWeakest(score.axes);
  if (weakest) {
    lines.push(
      `Axe le plus faible (exploitable) : ${axisLabel(weakest.id)} — ${weakest.score}/100`,
    );
  }

  // Recommendation
  if (recommendation) {
    lines.push(`Recommandation : ${renderRecommendation(recommendation)}`);
  }

  // Per-axis breakdown
  lines.push("");
  lines.push("Décomposition par axe :");
  for (const id of AXIS_ORDER) {
    const a = score.axes[id];
    if (!a) continue;
    lines.push(
      `- ${axisLabel(id)} : ${a.score}/100 (confiance ${axisConfidenceLabel(a.confidence)})`,
    );
  }

  // Phase 3.3 — Timeline récente. Lue directement depuis le timeline
  // engine (déterministe) — pas de recalcul. Le coach peut citer
  // "Tu as gagné 4 points ces 3 dernières semaines" ou "Tu viens de
  // passer dans la bande Solide" en s'appuyant sur ces lignes.
  //
  // Phase 3.3.1 — quand la timeline est vide (premier snapshot, pas
  // encore d'historique scellé), on injecte un bloc PÉDAGOGIQUE pour
  // que le coach explique le fonctionnement au lieu de fermer la
  // conversation par "reviens dans quelques jours".
  lines.push("");
  if (drawer.timeline && drawer.timeline.events.length > 0) {
    lines.push("Timeline récente :");
    for (const ev of drawer.timeline.events.slice(0, 6)) {
      lines.push(`- ${ev.week} · ${timelineEventLabel(ev)}`);
    }
  } else {
    lines.push("Timeline récente : pas encore d'historique.");
    lines.push(
      "Explication à donner si l'utilisateur demande son évolution :",
    );
    lines.push(
      "- Le score est calculé maintenant — il existe et est visible sur le dashboard.",
    );
    lines.push(
      "- Le suivi se construit semaine après semaine via des snapshots scellés chaque dimanche 23h locale.",
    );
    lines.push(
      "- Les premières tendances apparaîtront à partir du 2-3e snapshot scellé.",
    );
    lines.push(
      "- Ce qui sera analysé : évolution du score, changements de bande, renforcement du fonds d'urgence, objectifs créés et atteints, axes qui s'améliorent.",
    );
  }

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/*  FROZEN FR labels                                                           */
/* -------------------------------------------------------------------------- */

export function bandLabel(b: Band): string {
  return {
    rose: "À reprendre",
    ambre: "En construction",
    or: "Solide",
    emeraude: "Maîtrisé",
  }[b];
}

export function confidenceLabel(c: Confidence): string {
  return {
    HIGH: "Élevée",
    MEDIUM: "Moyenne",
    LOW: "Faible",
    INSUFFICIENT_DATA: "Données insuffisantes",
  }[c];
}

function axisConfidenceLabel(c: AxisResult["confidence"]): string {
  return {
    HIGH: "Élevée",
    MEDIUM: "Moyenne",
    LOW: "Faible",
    UNKNOWN: "Inconnue",
  }[c];
}

export function axisLabel(id: AxisId): string {
  return {
    discipline: "Discipline",
    resilience: "Résilience",
    trajectoire: "Trajectoire",
    couverture: "Couverture",
    objectifs: "Objectifs",
    comportement: "Comportement",
  }[id];
}

function directionLabel(d: "UP" | "DOWN" | "FLAT"): string {
  return { UP: "progression", DOWN: "recul", FLAT: "stable" }[d];
}

function strengthLabel(s: "WEAK" | "MEDIUM" | "STRONG"): string {
  return { WEAK: "légère", MEDIUM: "marquée", STRONG: "forte" }[s];
}

function areaLabel(area: string): string {
  return ({
    income: "revenus",
    housing: "logement",
    insurance: "assurances",
    food: "alimentation",
    transport: "transport",
  } as Record<string, string>)[area] ?? area;
}

function signedPoints(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "±0";
}

/* -------------------------------------------------------------------------- */
/*  Reason rendering — FR labels for the 21 reasonKeys                         */
/* -------------------------------------------------------------------------- */

function renderReason(
  key: string,
  payload: Record<string, string | number>,
): string {
  switch (key) {
    case "discipline_budget_streak_improved":
      return `budgets respectés (${payload.successCount}/${payload.total})`;
    case "discipline_budget_breach":
      return `${payload.failingCount} budget(s) dépassé(s)`;
    case "discipline_savings_more_regular":
      return "épargne plus régulière";
    case "discipline_savings_less_regular":
      return "épargne plus volatile";
    case "resilience_runway_improved":
      return `fonds d'urgence ${payload.from} → ${payload.to} mois`;
    case "resilience_runway_declined":
      return `fonds d'urgence ${payload.from} → ${payload.to} mois`;
    case "resilience_savings_grew":
      return "épargne en hausse";
    case "resilience_burn_rose":
      return "charges fixes en hausse";
    case "trajectoire_savings_rate_improved":
      return `taux d'épargne ${payload.fromPct}% → ${payload.toPct}%`;
    case "trajectoire_savings_rate_declined":
      return `taux d'épargne ${payload.fromPct}% → ${payload.toPct}%`;
    case "couverture_area_added":
      return `${areaLabel(String(payload.area))} renseigné`;
    case "couverture_area_removed":
      return `${areaLabel(String(payload.area))} retiré`;
    case "couverture_refined":
      return "profil affiné";
    case "objectifs_goal_completed":
      return "un objectif complété";
    case "objectifs_new_goal_set":
      return "un nouvel objectif défini";
    case "objectifs_no_goals_anymore":
      return "plus d'objectif actif";
    case "objectifs_progress_made":
      return `progression objectifs ${payload.pct}%`;
    case "objectifs_progress_stalled":
      return "progression objectifs en pause";
    case "comportement_more_active":
      return "suivi plus régulier";
    case "comportement_less_active":
      return "moins d'activité";
    case "stable_period":
      return "période stable";
    default:
      return key;
  }
}

/* -------------------------------------------------------------------------- */
/*  Recommendation rendering — FR labels for the 7 actions                     */
/* -------------------------------------------------------------------------- */

function renderRecommendation(r: HealthRecommendation): string {
  const gainSuffix =
    r.estimatedGain && r.estimatedGain > 0
      ? ` (≈ +${r.estimatedGain} points si l'utilisateur agit cette semaine)`
      : "";
  const p = r.payload;
  switch (r.titleKey) {
    case "recommend_build_runway":
      return `Renforcer le fonds d'urgence — mettre ${p.addAmount} CHF de côté ajoute ${p.gainMonths} mois de runway${gainSuffix}`;
    case "recommend_increase_savings_rate":
      return `Augmenter le taux d'épargne de ${p.fromPct}% à ${p.toPct}% via un virement automatique${gainSuffix}`;
    case "recommend_close_one_budget":
      return `Tenir un budget supplémentaire ce mois (${p.successCount}/${p.total} aujourd'hui, viser ${p.newSuccessCount})${gainSuffix}`;
    case "recommend_set_first_budgets":
      return `Poser ses premiers budgets (alimentation, loisirs, transport)${gainSuffix}`;
    case "recommend_complete_profile":
      return `Compléter ${areaLabel(String(p.area))} dans le profil financier${gainSuffix}`;
    case "recommend_set_first_goal":
      return `Définir un premier objectif chiffré à 6 ou 12 mois${gainSuffix}`;
    case "recommend_advance_goal":
      return `Faire avancer l'objectif courant de ${p.fromPct}% à ${p.toPct}%${gainSuffix}`;
    default:
      return r.titleKey;
  }
}

/* -------------------------------------------------------------------------- */
/*  Timeline event FR labels                                                   */
/* -------------------------------------------------------------------------- */

function timelineEventLabel(ev: TimelineEvent): string {
  switch (ev.type) {
    case "score_up":
      return `+${ev.impact} points cette semaine`;
    case "score_down":
      return `${ev.impact} points cette semaine`;
    case "band_changed":
      // titleKey format : "band_changed_to_<band>_<direction>"
      return `Passage en bande ${humanBandFromTitleKey(ev.titleKey)}`;
    case "runway_improved":
      return ev.impact !== null
        ? `Fonds d'urgence renforcé (+${ev.impact} mois)`
        : "Fonds d'urgence renforcé";
    case "major_area_added":
      return `${humanAreaFromTitleKey(ev.titleKey)} renseigné dans le profil`;
    case "goal_created":
      return "Nouvel objectif défini";
    case "goal_completed":
      return "Objectif atteint";
    case "recommendation_followed":
      return "Recommandation suivie";
  }
}

function humanBandFromTitleKey(key: string): string {
  if (key.includes("emeraude")) return "Maîtrisé";
  if (key.includes("_or_")) return "Solide";
  if (key.includes("ambre")) return "En construction";
  if (key.includes("rose")) return "À reprendre";
  return key;
}

function humanAreaFromTitleKey(key: string): string {
  const suffix = key.replace(/^major_area_added_/, "");
  return ({
    income: "Revenus",
    housing: "Logement",
    insurance: "Assurances",
    food: "Alimentation",
    transport: "Transport",
  } as Record<string, string>)[suffix] ?? suffix;
}

/* -------------------------------------------------------------------------- */
/*  Weakest axis selector                                                      */
/* -------------------------------------------------------------------------- */

function pickWeakest(axes: Record<AxisId, AxisResult>): AxisResult | null {
  let weakest: AxisResult | null = null;
  for (const id of AXIS_ORDER) {
    const a = axes[id];
    if (!a) continue;
    if (a.confidence !== "HIGH" && a.confidence !== "MEDIUM") continue;
    if (!weakest || a.score < weakest.score) {
      weakest = a;
    }
  }
  return weakest;
}
