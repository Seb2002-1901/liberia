export const APP_NAME = "LIBERIA";
export const APP_TAGLINE = "Reprends le contrôle de ton argent.";
export const APP_DESCRIPTION =
  "LIBERIA t'aide à comprendre ta situation financière, réduire ton stress et construire une stabilité durable.";

// LIBERIA est orientée Suisse — devise par défaut CHF, locale fr-CH.
// Les utilisateurs existants qui ont déjà une devise dans `profiles.currency`
// conservent leur choix (les fallbacks `?? "CHF"` ne réécrivent que les valeurs
// non-définies).
export const DEFAULT_CURRENCY = "CHF";
export const DEFAULT_LOCALE = "fr-CH";

export const ROUTES = {
  home: "/",
  pricing: "/pricing",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
  legal: "/legal",
  security: "/security",
  aiPolicy: "/ai-policy",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  budget: "/budget",
  incomes: "/incomes",
  expenses: "/expenses",
  goals: "/goals",
  savings: "/savings",
  investments: "/investments",
  opportunities: "/opportunities",
  coach: "/coach",
  plan: "/plan",
  profile: "/profile",
  settings: "/settings",
  subscription: "/settings/subscription",
  memory: "/settings/memory",
  expenseAnalytics: "/expenses/analytics",
  demo: "/demo",
} as const;

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Salaire", icon: "Briefcase" },
  { id: "freelance", label: "Freelance", icon: "Laptop" },
  { id: "business", label: "Activité", icon: "Building2" },
  { id: "investments", label: "Investissements", icon: "TrendingUp" },
  { id: "aid", label: "Aides / Allocations", icon: "HandCoins" },
  { id: "rental", label: "Revenus locatifs", icon: "Home" },
  { id: "other", label: "Autre", icon: "Coins" },
] as const;

export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]["id"];

export const EXPENSE_CATEGORIES = [
  { id: "housing", label: "Logement", icon: "Home", essential: true },
  { id: "food", label: "Alimentation", icon: "ShoppingBasket", essential: true },
  { id: "transport", label: "Transport", icon: "Car", essential: true },
  { id: "utilities", label: "Factures & énergie", icon: "Zap", essential: true },
  { id: "insurance", label: "Assurances", icon: "ShieldCheck", essential: true },
  { id: "health", label: "Santé", icon: "Stethoscope", essential: true },
  { id: "debt", label: "Crédits / Dettes", icon: "Banknote", essential: true },
  { id: "subscriptions", label: "Abonnements", icon: "Repeat", essential: false },
  { id: "leisure", label: "Loisirs", icon: "Sparkles", essential: false },
  { id: "shopping", label: "Shopping", icon: "ShoppingBag", essential: false },
  { id: "family", label: "Famille / Enfants", icon: "Users", essential: false },
  { id: "education", label: "Éducation", icon: "GraduationCap", essential: false },
  { id: "other", label: "Autre", icon: "MoreHorizontal", essential: false },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export const FREQUENCIES = [
  { id: "monthly", label: "Mensuel", multiplier: 1 },
  { id: "weekly", label: "Hebdomadaire", multiplier: 52 / 12 },
  { id: "yearly", label: "Annuel", multiplier: 1 / 12 },
  { id: "one_time", label: "Ponctuel", multiplier: 0 },
] as const;

export type FrequencyId = (typeof FREQUENCIES)[number]["id"];

export const FINANCIAL_SITUATIONS = [
  {
    id: "struggling",
    label: "Je suis en difficulté",
    description: "Mes dépenses dépassent mes revenus.",
  },
  {
    id: "tight",
    label: "Je m'en sors juste",
    description: "Je finis le mois sans marge.",
  },
  {
    id: "stable",
    label: "Je suis stable",
    description: "J'arrive à mettre de côté un peu.",
  },
  {
    id: "comfortable",
    label: "Je suis à l'aise",
    description: "J'épargne et je veux optimiser.",
  },
] as const;

export type FinancialSituationId = (typeof FINANCIAL_SITUATIONS)[number]["id"];

export const STRESS_LEVELS = [
  { value: 1, label: "Aucun stress" },
  { value: 2, label: "Léger" },
  { value: 3, label: "Modéré" },
  { value: 4, label: "Élevé" },
  { value: 5, label: "Très élevé" },
] as const;

export const GOAL_TYPES = [
  { id: "emergency_fund", label: "Fonds d'urgence", icon: "ShieldCheck" },
  { id: "debt_payoff", label: "Rembourser une dette", icon: "Banknote" },
  { id: "savings", label: "Épargne", icon: "PiggyBank" },
  { id: "purchase", label: "Achat important", icon: "ShoppingBag" },
  { id: "travel", label: "Voyage", icon: "Plane" },
  { id: "increase_income", label: "Augmenter mes revenus", icon: "TrendingUp" },
  { id: "other", label: "Autre", icon: "Target" },
] as const;

export type GoalTypeId = (typeof GOAL_TYPES)[number]["id"];

/**
 * Behavior traits captured during onboarding — informe la personnalisation
 * future de l'IA et le ton des recommandations. Multi-select, jamais
 * jugeant (les libellés sont neutres et bienveillants).
 */
export const BEHAVIOR_TRAITS = [
  {
    id: "impulsive",
    label: "Achats impulsifs",
    description: "Parfois je craque sans avoir prévu.",
    icon: "Zap",
  },
  {
    id: "avoidant",
    label: "J'évite de regarder",
    description: "Mes finances me stressent, je préfère ne pas y penser.",
    icon: "EyeOff",
  },
  {
    id: "organized",
    label: "Plutôt organisé·e",
    description: "Je tiens un suivi, j'aime savoir où ça va.",
    icon: "ListChecks",
  },
  {
    id: "anxious",
    label: "Anxieux·se face à l'argent",
    description: "Penser à l'argent me met sous tension.",
    icon: "HeartPulse",
  },
  {
    id: "motivated",
    label: "Très motivé·e",
    description: "Je veux passer à l'action, maintenant.",
    icon: "Flame",
  },
  {
    id: "lost",
    label: "Un peu perdu·e",
    description: "Je ne sais plus par où commencer.",
    icon: "Compass",
  },
  {
    id: "disciplined",
    label: "Discipliné·e",
    description: "Je tiens mes engagements quand je les pose.",
    icon: "ShieldCheck",
  },
  {
    id: "rebuilding",
    label: "En reconstruction",
    description: "Je sors d'une période difficile, je remonte la pente.",
    icon: "Sparkles",
  },
] as const;

export type BehaviorTraitId = (typeof BEHAVIOR_TRAITS)[number]["id"];

/**
 * Coaching tone — picked once in /settings, drives the wording of the
 * dashboard insight, plan suggestions and (later) the LLM system prompt.
 */
export const COACHING_TONES = [
  {
    id: "calm",
    label: "Calme et rassurant",
    description: "Doux, sans pression. Le rythme prime sur la performance.",
  },
  {
    id: "direct",
    label: "Direct et motivant",
    description: "Clair, énergique, factuel. Pas de détour.",
  },
  {
    id: "structured",
    label: "Très structuré",
    description: "Étapes nettes, checklists, jalons mesurables.",
  },
  {
    id: "gentle",
    label: "Doux et progressif",
    description: "Petits pas, beaucoup de bienveillance.",
  },
] as const;

export type CoachingToneId = (typeof COACHING_TONES)[number]["id"];

export const RECURRING_CHALLENGES = [
  { id: "irregular_income", label: "Revenus irréguliers" },
  { id: "subscriptions", label: "Abonnements qui s'accumulent" },
  { id: "impulse_shopping", label: "Achats impulsifs" },
  { id: "social_pressure", label: "Pression sociale" },
  { id: "emergencies", label: "Imprévus fréquents" },
  { id: "debt_load", label: "Charge de dette élevée" },
  { id: "tracking_fatigue", label: "Difficile de tout suivre" },
  { id: "no_savings_habit", label: "Pas d'habitude d'épargne" },
] as const;

export type RecurringChallengeId =
  (typeof RECURRING_CHALLENGES)[number]["id"];

export const SPENDING_TRIGGERS = [
  { id: "stress", label: "Stress" },
  { id: "boredom", label: "Ennui" },
  { id: "social", label: "Sorties et social" },
  { id: "online", label: "Shopping en ligne" },
  { id: "food", label: "Restaurants / livraisons" },
  { id: "gifts", label: "Cadeaux pour les autres" },
  { id: "fomo", label: "Peur de rater" },
  { id: "rewards", label: "Récompense après effort" },
] as const;

export type SpendingTriggerId = (typeof SPENDING_TRIGGERS)[number]["id"];

/**
 * Modèle business LIBERIA — Phase 6 (mise à jour Q2 2026) :
 *
 *  - PAS de plan gratuit permanent.
 *  - DÉMO disponible sans compte (route /demo). Les données saisies en
 *    démo NE SONT PAS sauvegardées et sont perdues à la sortie.
 *  - Essai gratuit 14 jours : carte bancaire REQUISE à l'inscription
 *    pour démarrer l'essai. Aucun prélèvement pendant l'essai. Le
 *    plan choisi se déclenche automatiquement à J+14. L'utilisateur
 *    peut annuler à tout moment AVANT la fin de l'essai pour ne rien
 *    payer.
 *
 * Deux tiers : Standard et Premium. Chacun a 2 fréquences (mensuel /
 * annuel). L'annuel est positionné comme l'offre attractive :
 * équivalent mensuel ≈ 2 mois économisés par an.
 *
 * Standard : 14.95 CHF/mois — 149 CHF/an (≈ 12.42 CHF/mois — ~30 CHF
 *   d'économie par rapport à 12 × mensuel).
 * Premium  : 24.95 CHF/mois — 249 CHF/an (≈ 20.75 CHF/mois — ~50 CHF
 *   d'économie par rapport à 12 × mensuel).
 *
 * `PLANS` ici sert au rendu UI marketing/abonnement uniquement. La
 * source de vérité des prix Stripe est dans `lib/stripe/config.ts`
 * (STRIPE_PLANS).
 */
export const PLANS = {
  standard: {
    id: "standard",
    name: "Standard",
    tagline: "Le cockpit financier essentiel.",
    monthly: {
      id: "standard_monthly",
      priceCHF: 14.95,
      monthlyEquivalentCHF: 14.95,
      interval: "month",
    },
    yearly: {
      id: "standard_yearly",
      // 14.95 × 12 = 179.40. Annuel à 149 → économie ≈ 30.40 CHF/an.
      // Équivalent mensuel = 149 / 12 ≈ 12.42 CHF/mois.
      priceCHF: 149,
      monthlyEquivalentCHF: 12.42,
      interval: "year",
    },
    features: [
      "Score financier et analyse complète",
      "Suivi revenus, dépenses, budget",
      "Coach IA hebdomadaire",
      "Plan d'action personnalisé",
      "Application mobile + desktop",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Toute la puissance du copilote IA Liberia.",
    monthly: {
      id: "premium_monthly",
      priceCHF: 24.95,
      monthlyEquivalentCHF: 24.95,
      interval: "month",
    },
    yearly: {
      id: "premium_yearly",
      // 24.95 × 12 = 299.40. Annuel à 249 → économie ≈ 50.40 CHF/an.
      // Équivalent mensuel = 249 / 12 ≈ 20.75 CHF/mois.
      priceCHF: 249,
      monthlyEquivalentCHF: 20.75,
      interval: "year",
    },
    features: [
      "Tout Standard inclus",
      "Détection avancée d'opportunités",
      "Trajectoire patrimoniale à 3 ans",
      "Résumé hebdomadaire IA personnalisé",
      "Support prioritaire",
    ],
    badge: "Recommandé",
  },
} as const;

export type PlanTierId = keyof typeof PLANS;
export type PlanIntervalId = "monthly" | "yearly";
/** Identifiant complet d'un plan facturable (tier + intervalle). */
export type PlanId =
  | "standard_monthly"
  | "standard_yearly"
  | "premium_monthly"
  | "premium_yearly";

/**
 * Limite goals active appliquée UNIQUEMENT aux comptes qui n'ont plus
 * d'abonnement valide (trial expiré sans paiement, ou abonnement
 * cancelled/unpaid). Les utilisateurs `trialing` et `active` ont accès
 * illimité.
 */
export const LAPSED_ACCOUNT_GOAL_LIMIT = 1;
