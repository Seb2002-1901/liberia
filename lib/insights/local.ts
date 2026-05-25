/**
 * Local insight generator — produces a single "headline" insight from a
 * user's financial snapshot, deterministically and without calling any
 * external LLM. Used today as the onboarding wow-moment and as the
 * dashboard "Insight du jour" surface. When ANTHROPIC_API_KEY is wired
 * up later, callers can opt into a richer LLM-generated version; the
 * shape returned here stays stable so the UI doesn't change.
 *
 * Design rules:
 *  - never invent numbers — only echo what we computed from real fields
 *  - keep tone calm and concrete, never judgmental
 *  - one headline + one supporting line + one concrete next action
 */
import { formatCurrency } from "@/lib/utils";

export type InsightInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyDebt: number;
  hasEmergencyFund: boolean;
  perceivedStress: number;
  situation: "struggling" | "tight" | "stable" | "comfortable";
  mainGoal?: string | null;
  behaviorTraits?: readonly string[];
  currency?: string;
};

export type Insight = {
  headline: string;
  body: string;
  metric: string | null;
  metricLabel: string | null;
  tone: "warning" | "neutral" | "positive";
  nextAction: string;
};

const round = (n: number) => Math.round(n);

export function generateLocalInsight(input: InsightInput): Insight {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    monthlyDebt,
    hasEmergencyFund,
    behaviorTraits = [],
    currency = "CHF",
  } = input;

  const fmt = (n: number) => formatCurrency(n, currency);
  const cashflow = monthlyIncome - monthlyExpenses;
  const runway = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : Infinity;
  const savingsRate = monthlyIncome > 0 ? cashflow / monthlyIncome : 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;
  const traits = new Set(behaviorTraits);

  // Cashflow négatif → priorité absolue, ton calme.
  if (cashflow < 0) {
    const gap = Math.abs(cashflow);
    const targetCut = Math.max(20, round(gap * 0.5));
    return {
      headline: `Tu dépenses environ ${fmt(gap)} de plus que tu ne gagnes chaque mois.`,
      body: traits.has("avoidant")
        ? "C'est inconfortable à regarder, c'est normal. On va y aller doucement, une dépense à la fois."
        : "Bonne nouvelle : c'est mesurable, donc adressable. On va viser un poste à la fois.",
      metric: fmt(gap),
      metricLabel: "Écart mensuel",
      tone: "warning",
      nextAction: `Identifie une dépense récurrente que tu peux réduire d'environ ${fmt(targetCut)} ce mois-ci.`,
    };
  }

  // Dette > 30% revenus → priorité dette.
  if (dti >= 30 && monthlyDebt > 0) {
    return {
      headline: `Tes remboursements représentent ${dti.toFixed(0)}% de tes revenus.`,
      body:
        "Au-delà de 30%, ils pèsent fortement sur ton reste à vivre. On peut réduire ce ratio avant de viser l'épargne.",
      metric: `${dti.toFixed(0)}%`,
      metricLabel: "Dette / revenus",
      tone: "warning",
      nextAction:
        "Liste tes crédits par taux d'intérêt et concentre tes efforts sur le plus coûteux.",
    };
  }

  // Fonds d'urgence absent et reste à vivre positif → fondation.
  if (!hasEmergencyFund && runway < 1 && cashflow > 0) {
    const monthlyTarget = Math.max(50, round(cashflow * 0.3));
    return {
      headline: `Ton premier palier : construire 1 mois de dépenses de côté.`,
      body: traits.has("anxious")
        ? "Un coussin financier réduit l'anxiété quotidienne — même petit, il change tout."
        : "Un fonds d'urgence te protège des imprévus avant de viser des objectifs plus ambitieux.",
      metric: fmt(monthlyTarget),
      metricLabel: "Virement automatique suggéré",
      tone: "neutral",
      nextAction: `Programme un virement automatique de ${fmt(monthlyTarget)} en début de mois vers un compte séparé.`,
    };
  }

  // Reste à vivre faible mais positif → optimisation douce.
  if (savingsRate < 0.05 && monthlyIncome > 0) {
    const estimate = round(monthlyExpenses * 0.08);
    return {
      headline: `Tu pourrais probablement libérer environ ${fmt(estimate)} par mois.`,
      body:
        "Les postes non essentiels représentent souvent 5 à 10% des dépenses sans qu'on s'en rende compte. Une revue rapide suffit.",
      metric: fmt(estimate),
      metricLabel: "Marge potentielle estimée",
      tone: "neutral",
      nextAction:
        "Passe en revue tes abonnements actifs et coupe ceux que tu n'as pas utilisés ce mois-ci.",
    };
  }

  // Runway > 3 mois et savings rate ≥ 15% → tonalité positive, accélération.
  if (runway >= 3 && savingsRate >= 0.15) {
    const monthlyAvailable = round(cashflow);
    return {
      headline: `Tu épargnes déjà ${(savingsRate * 100).toFixed(0)}% de tes revenus.`,
      body:
        "Ta base est solide. Tu peux accélérer un objectif, consolider ton fonds d'urgence ou commencer à faire travailler une partie de l'épargne.",
      metric: fmt(monthlyAvailable),
      metricLabel: "Capacité d'épargne mensuelle",
      tone: "positive",
      nextAction:
        "Choisis un objectif chiffré sur 6 à 12 mois et flèche-y une part de ton reste à vivre.",
    };
  }

  // Profil intermédiaire — encouragement + nudge.
  const projection = round(cashflow * 12);
  return {
    headline:
      projection > 0
        ? `Tu pourrais épargner environ ${fmt(projection)} sur 12 mois à ton rythme actuel.`
        : `Tu es à l'équilibre — c'est une base de travail saine.`,
    body: traits.has("motivated")
      ? "Tu sembles prêt·e à passer à l'action. On peut transformer cette énergie en habitudes simples qui tiennent."
      : "Petit à petit, des ajustements simples compoundent. L'objectif n'est pas la perfection mais la régularité.",
    metric: projection > 0 ? fmt(projection) : fmt(0),
    metricLabel: projection > 0 ? "Projection 12 mois" : "Reste à vivre mensuel",
    tone: projection > 0 ? "positive" : "neutral",
    nextAction:
      "Définis 1 habitude financière à tester pendant 30 jours — virement automatique, budget shopping, ou revue hebdo.",
  };
}
