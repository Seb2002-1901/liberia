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
  coach: "/coach",
  plan: "/plan",
  profile: "/profile",
  settings: "/settings",
  subscription: "/settings/subscription",
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
  { id: "other", label: "Autre", icon: "Target" },
] as const;

export type GoalTypeId = (typeof GOAL_TYPES)[number]["id"];

/**
 * Modèle business LIBERIA :
 *  - pas de plan gratuit permanent
 *  - essai gratuit 14 jours (carte requise à l'inscription)
 *  - puis prélèvement automatique mensuel ou annuel
 *
 * `PLANS` ici sert au rendu UI marketing/abonnement uniquement. La source
 * de vérité des prix Stripe est dans `lib/stripe/config.ts` (STRIPE_PLANS).
 */
export const PLANS = {
  monthly: {
    id: "premium_monthly",
    name: "Mensuel",
    priceCHF: 14.99,
    monthlyEquivalentCHF: 14.99,
    interval: "month",
    description:
      "Accès complet à LIBERIA. Annule à tout moment depuis ton espace.",
    features: [
      "14 jours gratuits, sans engagement",
      "Coach IA conversationnel",
      "Plan financier IA personnalisé 30 / 60 / 90 jours",
      "Suivi budget complet (revenus, dépenses, objectifs)",
      "Récap hebdo par email",
      "Annulable à tout moment",
    ],
  },
  yearly: {
    id: "premium_yearly",
    name: "Annuel",
    priceCHF: 119.99,
    monthlyEquivalentCHF: 9.99,
    interval: "year",
    description: "Soit ~9.99 CHF/mois — environ 60 CHF d'économie sur l'année.",
    features: [
      "14 jours gratuits, sans engagement",
      "Tout ce qu'il y a dans le Mensuel",
      "Économise environ 60 CHF par an",
      "Facturation une seule fois par an",
      "Annulable à tout moment",
    ],
    badge: "Recommandé",
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Limite goals active appliquée UNIQUEMENT aux comptes qui n'ont plus
 * d'abonnement valide (trial expiré sans paiement, ou abonnement
 * cancelled/unpaid). Les utilisateurs `trialing` et `active` ont accès
 * illimité.
 */
export const LAPSED_ACCOUNT_GOAL_LIMIT = 1;
