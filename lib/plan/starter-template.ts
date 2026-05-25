/**
 * Starter 90-day plan — deterministic, curated by `situation` tier.
 *
 * Surfaced on /plan when the user has no AI-generated plan yet (because
 * ANTHROPIC_API_KEY isn't configured, or they haven't generated one).
 * Gives the sensation that LIBERIA is already accompanying them, without
 * requiring an LLM call.
 *
 * When Anthropic is wired up and the user generates a personalized plan,
 * that one takes over (the existing PlanProgress / PlanTimeline path).
 */

export type StarterStep = {
  week_number: number;
  focus: string;
  title: string;
  description: string;
  category: "review" | "habit" | "save" | "debt_payoff" | "income_boost";
};

export type StarterPlan = {
  title: string;
  summary: string;
  steps: StarterStep[];
};

type Situation = "struggling" | "tight" | "stable" | "comfortable";

const COMMON_STEPS_W1_W4: StarterStep[] = [
  {
    week_number: 1,
    focus: "Faire l'état des lieux",
    title: "Liste tes 5 dépenses fixes les plus importantes",
    description:
      "Loyer, assurances, abonnements, transport. Note les montants exacts dans LIBERIA — sans jugement, juste pour voir clair.",
    category: "review",
  },
  {
    week_number: 1,
    focus: "Faire l'état des lieux",
    title: "Identifie 1 abonnement à supprimer ou renégocier",
    description:
      "Un seul, le plus évident. Streaming non utilisé, salle de sport en pause, assurance doublonnée — on commence petit.",
    category: "review",
  },
  {
    week_number: 2,
    focus: "Stabiliser les bases",
    title: "Note 7 jours de dépenses quotidiennes",
    description:
      "Café, transport, courses, sorties. Tu n'as rien à changer cette semaine, juste à observer ton schéma réel.",
    category: "habit",
  },
  {
    week_number: 3,
    focus: "Premier verrou",
    title: "Programme un virement automatique vers un compte épargne",
    description:
      "Même symbolique (20–50 CHF). L'idée est de créer le réflexe — le montant grandira ensuite.",
    category: "save",
  },
  {
    week_number: 4,
    focus: "Premier verrou",
    title: "Définis 1 objectif chiffré sur 90 jours",
    description:
      "Concret et réaliste : « 500 CHF de fonds d'urgence », « rembourser X de carte de crédit ». Active-le dans la section Objectifs.",
    category: "save",
  },
];

const STRUGGLING_PATH: StarterStep[] = [
  {
    week_number: 5,
    focus: "Libérer du souffle",
    title: "Contacte ton bailleur ou ton banquier pour un rééchelonnement",
    description:
      "Si une charge te met sous tension, propose un étalement. La plupart acceptent — la pire réponse est non.",
    category: "debt_payoff",
  },
  {
    week_number: 6,
    focus: "Libérer du souffle",
    title: "Demande de l'aide à un service social ou une association",
    description:
      "Caritas, Centre social régional, Pro Senectute — beaucoup d'aides existent et restent confidentielles. Tu ne perds rien à demander.",
    category: "review",
  },
  {
    week_number: 7,
    focus: "Réduire 1 poste",
    title: "Choisis 1 poste non essentiel à diviser par 2 ce mois-ci",
    description:
      "Livraison, sorties, vêtements. Pas par culpabilité — juste pour gagner du reste à vivre.",
    category: "habit",
  },
  {
    week_number: 8,
    focus: "Réduire 1 poste",
    title: "Annule 1 abonnement supplémentaire",
    description:
      "À ce stade tu as une meilleure visibilité — vise ceux que tu paies par habitude sans en tirer vraiment de valeur.",
    category: "review",
  },
  {
    week_number: 9,
    focus: "Augmenter les rentrées",
    title: "Liste 3 pistes de revenus complémentaires réalistes",
    description:
      "Heures supplémentaires, mission ponctuelle, vente d'objets inutilisés. Une seule piste activée suffit.",
    category: "income_boost",
  },
  {
    week_number: 10,
    focus: "Augmenter les rentrées",
    title: "Active 1 piste cette semaine",
    description:
      "Inscription, message, annonce. Le plus dur c'est le premier pas — ensuite ça déroule.",
    category: "income_boost",
  },
  {
    week_number: 11,
    focus: "Construire le fonds d'urgence",
    title: "Vise 100 CHF de fonds d'urgence cette semaine",
    description:
      "Petit palier mais symbolique. Ton premier coussin t'enlève déjà de la charge mentale.",
    category: "save",
  },
  {
    week_number: 12,
    focus: "Construire le fonds d'urgence",
    title: "Bilan : où en es-tu vs. il y a 90 jours ?",
    description:
      "Revue calme. Note 3 choses qui ont changé positivement. Pose le prochain palier de 90 jours.",
    category: "review",
  },
];

const TIGHT_PATH: StarterStep[] = [
  {
    week_number: 5,
    focus: "Optimiser le mois",
    title: "Renégocie 1 contrat (mobile, assurance, internet)",
    description:
      "Appelle ton fournisseur, demande la dernière offre fidélisation. 15 minutes peuvent libérer 20–80 CHF/mois.",
    category: "review",
  },
  {
    week_number: 6,
    focus: "Optimiser le mois",
    title: "Plafonne 1 catégorie variable (loisirs, shopping)",
    description:
      "Fixe-toi un budget hebdomadaire. Si tu dépasses, ça repart à zéro la semaine suivante — pas de culpabilité.",
    category: "habit",
  },
  {
    week_number: 7,
    focus: "Premier fonds d'urgence",
    title: "Augmente ton virement automatique de 10–20%",
    description:
      "Si tu épargnais 50 CHF, passe à 60 CHF. Ajustement à peine perceptible, effet composé important.",
    category: "save",
  },
  {
    week_number: 8,
    focus: "Premier fonds d'urgence",
    title: "Sépare physiquement ton épargne",
    description:
      "Compte différent, voire banque différente. Plus l'argent est éloigné de ton compte courant, moins tu y touches.",
    category: "save",
  },
  {
    week_number: 9,
    focus: "Réduire les dettes coûteuses",
    title: "Liste tes crédits par taux d'intérêt (du plus cher au moins cher)",
    description:
      "La carte de crédit ou le crédit conso ressort souvent en tête. Vise celui-là en priorité.",
    category: "debt_payoff",
  },
  {
    week_number: 10,
    focus: "Réduire les dettes coûteuses",
    title: "Bascule un mois de paiement minimum vers un remboursement plus rapide",
    description:
      "Même 50 CHF de plus sur le crédit le plus cher économise des centaines à long terme.",
    category: "debt_payoff",
  },
  {
    week_number: 11,
    focus: "Pérenniser l'habitude",
    title: "Crée 1 routine de revue hebdo (10 min)",
    description:
      "Même jour, même heure. Tu ouvres LIBERIA, tu regardes ton reste à vivre, tu ajustes si besoin.",
    category: "habit",
  },
  {
    week_number: 12,
    focus: "Pérenniser l'habitude",
    title: "Pose le prochain objectif 90 jours",
    description:
      "Atteindre 1 mois de fonds d'urgence ? Rembourser un crédit ? Choisis 1 cap clair et chiffré.",
    category: "review",
  },
];

const STABLE_PATH: StarterStep[] = [
  {
    week_number: 5,
    focus: "Sécuriser",
    title: "Vise 3 mois de fonds d'urgence",
    description:
      "Tu as une base — la prochaine étape c'est la sécurité long terme. Calcule le montant cible et fixe l'échéance.",
    category: "save",
  },
  {
    week_number: 6,
    focus: "Sécuriser",
    title: "Audit assurances : retire les doublons",
    description:
      "Ménage, RC privée, voyage. Beaucoup de couvertures se chevauchent. Une consultation gratuite avec un courtier indépendant suffit souvent.",
    category: "review",
  },
  {
    week_number: 7,
    focus: "Optimiser l'épargne",
    title: "Compare ton compte épargne actuel aux meilleures offres",
    description:
      "Si ton taux est < à 1%, regarde ce que proposent les banques en ligne. La différence se compte en centaines de CHF / an.",
    category: "save",
  },
  {
    week_number: 8,
    focus: "Optimiser l'épargne",
    title: "Augmente ton virement automatique de 10%",
    description:
      "Tu ne sens pas la différence sur ton reste à vivre, mais sur 12 mois ça représente déjà un beau coussin supplémentaire.",
    category: "save",
  },
  {
    week_number: 9,
    focus: "Faire travailler une partie",
    title: "Informe-toi sur le 3e pilier (Suisse) ou un placement long terme",
    description:
      "Renseigne-toi avant d'investir. Pas de précipitation. Cette semaine = lecture seulement.",
    category: "review",
  },
  {
    week_number: 10,
    focus: "Faire travailler une partie",
    title: "Définis ton allocation cible (court / moyen / long terme)",
    description:
      "Combien gardes-tu liquide ? Combien tu peux bloquer 5+ ans ? Pose les ratios avant d'agir.",
    category: "review",
  },
  {
    week_number: 11,
    focus: "Cap long terme",
    title: "Définis 1 objectif chiffré à 12 mois",
    description:
      "« Fonds d'urgence à 6 mois », « 3e pilier ouvert et alimenté », « X CHF investis ». Pose-le dans Objectifs.",
    category: "save",
  },
  {
    week_number: 12,
    focus: "Cap long terme",
    title: "Bilan 90 jours + plan trimestre suivant",
    description:
      "Revue posée. Ce qui a marché, ce que tu reconduis, ce que tu fais évoluer. Tu as les repères maintenant.",
    category: "review",
  },
];

const COMFORTABLE_PATH: StarterStep[] = [
  {
    week_number: 5,
    focus: "Affiner l'allocation",
    title: "Calcule ta capacité d'épargne réelle (vs. déclarative)",
    description:
      "Tu épargnes peut-être plus que tu ne crois. Compare ce qui sort de ton compte chaque mois vs. ce que tu penses mettre de côté.",
    category: "review",
  },
  {
    week_number: 6,
    focus: "Affiner l'allocation",
    title: "Définis ton allocation cible (liquidités / investi / long terme)",
    description:
      "Quel % pour les imprévus ? Pour la retraite ? Pour les projets 3–5 ans ? Pose-le clairement.",
    category: "review",
  },
  {
    week_number: 7,
    focus: "Faire travailler",
    title: "Ouvre ou alimente un 3e pilier (Suisse)",
    description:
      "Optimisation fiscale + retraite. Plafond annuel à vérifier selon ton statut.",
    category: "save",
  },
  {
    week_number: 8,
    focus: "Faire travailler",
    title: "Compare les frais de tes placements actuels",
    description:
      "1% de frais en trop sur 20 ans = des dizaines de milliers de CHF en moins. Audit avant tout.",
    category: "review",
  },
  {
    week_number: 9,
    focus: "Préparer un projet concret",
    title: "Définis 1 projet chiffré à horizon 1–3 ans",
    description:
      "Achat immobilier, sabbatique, lancement d'activité. Pose le montant cible et l'échéance.",
    category: "save",
  },
  {
    week_number: 10,
    focus: "Préparer un projet concret",
    title: "Sépare ce projet du reste de ton épargne",
    description:
      "Compte ou fonds dédié. Tu vois la progression réelle, tu ne ponctionnes pas par erreur.",
    category: "save",
  },
  {
    week_number: 11,
    focus: "Anti-fragiliser",
    title: "Audit revenus : à quel point ton flux dépend d'une seule source ?",
    description:
      "Diversifier les revenus est aussi important que diversifier l'épargne. Identifie 1 levier réaliste.",
    category: "income_boost",
  },
  {
    week_number: 12,
    focus: "Anti-fragiliser",
    title: "Bilan 90 jours + cap annuel",
    description:
      "Tu as la base et la marge — pose des objectifs annuels mesurables et choisis-en 2 prioritaires.",
    category: "review",
  },
];

const PATHS: Record<Situation, StarterStep[]> = {
  struggling: STRUGGLING_PATH,
  tight: TIGHT_PATH,
  stable: STABLE_PATH,
  comfortable: COMFORTABLE_PATH,
};

const TITLES: Record<Situation, string> = {
  struggling: "Plan 90 jours — Reprendre le souffle",
  tight: "Plan 90 jours — Stabiliser le mois",
  stable: "Plan 90 jours — Consolider la base",
  comfortable: "Plan 90 jours — Optimiser et accélérer",
};

const SUMMARIES: Record<Situation, string> = {
  struggling:
    "Trois mois pour réduire la pression, libérer du souffle et reconstruire un premier coussin financier. Une étape à la fois, sans précipitation.",
  tight:
    "Trois mois pour mettre fin aux fins de mois tendues, créer un premier fonds d'urgence et alléger les dettes les plus coûteuses.",
  stable:
    "Trois mois pour consolider tes fondations, sécuriser ton épargne et préparer une part qui travaille pour toi.",
  comfortable:
    "Trois mois pour affiner ton allocation, faire travailler ton épargne et préparer concrètement un projet d'envergure.",
};

export function getStarterPlan(situation: Situation): StarterPlan {
  return {
    title: TITLES[situation],
    summary: SUMMARIES[situation],
    steps: [...COMMON_STEPS_W1_W4, ...PATHS[situation]],
  };
}
