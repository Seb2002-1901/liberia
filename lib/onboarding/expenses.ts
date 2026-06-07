/**
 * Phase 4.0 J3 — Onboarding expenses seeding.
 *
 * Quand l'utilisateur complète l'onboarding avec le breakdown des 4
 * catégories majeures, le serveur crée 4 expense entries (1 par
 * catégorie non-null avec montant ≥ 0) dans la table `expenses`.
 * C'est ce qui peuple la Couverture FHS dès J0 et débloque le wow
 * que le user voit en arrivant sur le dashboard.
 *
 * Idempotence : les entries d'onboarding sont taggées par leur champ
 * `notes` (constante ONBOARDING_EXPENSE_TAG). Avant d'insérer, on
 * supprime les entries ayant ce tag pour le user — re-run safe.
 *
 * Pure : zéro I/O. Testable trivialement.
 */

import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "@/lib/constants";

/** Constante stable utilisée pour reconnaître les entries d'onboarding
 *  et autoriser leur remplacement idempotent. Ne pas modifier sans
 *  migration de données. */
export const ONBOARDING_EXPENSE_TAG = "[onboarding]";

/** Catégories réellement saisies à l'onboarding. Sous-ensemble strict
 *  des EXPENSE_CATEGORIES — typage local pour éviter qu'un ajout
 *  futur de catégorie ne casse silencieusement le mapping. */
const ONBOARDING_CATEGORIES = ["housing", "insurance", "food", "transport"] as const;
type OnboardingCategory = (typeof ONBOARDING_CATEGORIES)[number];

export interface ExpenseBreakdown {
  housing: number | null;
  insurance: number | null;
  food: number | null;
  transport: number | null;
}

/** Shape de la row INSERT-able dans la table `expenses` (subset des
 *  colonnes — les defaults DB gèrent le reste). */
export interface OnboardingExpenseEntry {
  user_id: string;
  label: string;
  amount: number;
  category: ExpenseCategoryId;
  frequency: "monthly";
  notes: string;
}

/** Labels FR pré-cuits pour les 4 catégories. L'utilisateur peut les
 *  renommer plus tard via /expenses ; le seed initial reste lisible. */
const CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  housing: "Logement (loyer ou hypothèque)",
  insurance: "Assurances",
  food: "Alimentation",
  transport: "Transport",
};

/**
 * Construit la liste des expense entries à insérer pour un user à
 * partir du breakdown saisi à l'onboarding.
 *
 * Règles :
 *  - Une entry est créée SI ET SEULEMENT SI value !== null ET value ≥ 0
 *  - "Je ne sais pas" (= null) → pas d'entry → catégorie absente du FHS
 *    Couverture (honnête, le coach demandera plus tard)
 *  - Montant 0 → entry créée à 0 (= "je n'en ai pas, vraiment")
 *  - Ordre : housing, insurance, food, transport (matches FHS axes)
 *
 * @returns array vide si rien à insérer
 */
export function buildExpenseEntriesFromBreakdown(
  userId: string,
  breakdown: ExpenseBreakdown,
): OnboardingExpenseEntry[] {
  const out: OnboardingExpenseEntry[] = [];
  for (const cat of ONBOARDING_CATEGORIES) {
    const v = breakdown[cat];
    if (v === null) continue;
    if (v < 0) continue;
    // Defense-in-depth : la catégorie doit exister dans le canon.
    // Si jamais EXPENSE_CATEGORIES bouge, on tombe sur l'erreur ici
    // plutôt que dans une migration silencieuse.
    if (!EXPENSE_CATEGORIES.some((c) => c.id === cat)) continue;
    out.push({
      user_id: userId,
      label: CATEGORY_LABELS[cat],
      amount: v,
      category: cat,
      frequency: "monthly",
      notes: ONBOARDING_EXPENSE_TAG,
    });
  }
  return out;
}

/**
 * Somme des montants RÉELLEMENT renseignés (ignore les null).
 * Utilisé pour calculer la valeur `monthly_expenses` legacy du
 * financial_profile : on ne fait pas mentir le chiffre global en
 * comptant les "je ne sais pas" comme 0.
 */
export function sumKnownExpenses(breakdown: ExpenseBreakdown): number {
  const vals = [
    breakdown.housing,
    breakdown.insurance,
    breakdown.food,
    breakdown.transport,
  ];
  return vals
    .filter((v): v is number => v !== null && v >= 0)
    .reduce((sum, v) => sum + v, 0);
}

/**
 * True si AU MOINS une catégorie est renseignée (montant ≥ 0).
 * Une saisie 100% "je ne sais pas" n'a pas de sens — la validation
 * UI le bloque côté composant, mais on garde ce filet côté action.
 */
export function hasAnyKnownExpense(breakdown: ExpenseBreakdown): boolean {
  return (
    breakdown.housing !== null ||
    breakdown.insurance !== null ||
    breakdown.food !== null ||
    breakdown.transport !== null
  );
}
