import type { Expense, Income } from "@/types/database";

/**
 * Phase 5.0 S3 — calcul de delta % entre le mois en cours et le mois
 * précédent.
 *
 * Utilisé par les 4 KPI cards du dashboard (Revenus mensuels,
 * Dépenses mensuelles, Reste à vivre, Fonds d'urgence).
 *
 * Pur, déterministe, testable. Aucun appel I/O.
 *
 * Convention de signes :
 *   - "positive" = augmentation arithmétique (delta > 0)
 *   - "negative" = diminution arithmétique (delta < 0)
 *   - "neutral"  = pas de comparaison possible (mois précédent vide
 *                  ou les deux mois identiques)
 *
 * IMPORTANT : la SÉMANTIQUE (est-ce une bonne ou mauvaise
 * nouvelle ?) est laissée au consommateur. Pour les revenus,
 * "positive" est une bonne nouvelle (flèche verte). Pour les
 * dépenses, c'est l'inverse — "negative" est une bonne nouvelle.
 * Le composant KpiCard décide quelle couleur appliquer selon
 * `polarity: "income-like" | "expense-like" | "neutral"`.
 *
 * Empty state : si les revenus/dépenses du mois précédent sont à 0
 * (donc pas de comparaison possible), on renvoie {direction:
 * "neutral", percent: null} et le KpiCard affiche "—". JAMAIS de
 * faux pourcentage extrapolé.
 */

export type DeltaDirection = "positive" | "negative" | "neutral";

export interface MonthlyDelta {
  /** Pourcentage absolu (toujours positif), null si pas calculable. */
  percent: number | null;
  /** Direction du changement. */
  direction: DeltaDirection;
}

/**
 * Sépare une liste de transactions datées en deux buckets : mois
 * en cours, mois précédent. La colonne temporelle utilisée est
 * `created_at` (les schémas LIBERIA n'ont pas de colonne `date`
 * séparée — la date de transaction = date de saisie).
 *
 * `referenceDate` doit représenter "aujourd'hui" — typiquement
 * `new Date()` au moment de l'agrégation. Exposé pour les tests
 * (injection de dates fixes).
 */
function splitByMonth<T extends { created_at?: string | null }>(
  rows: T[],
  referenceDate: Date,
): { thisMonth: T[]; lastMonth: T[] } {
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth(); // 0-11
  const lastMonthYear = refMonth === 0 ? refYear - 1 : refYear;
  const lastMonthIdx = refMonth === 0 ? 11 : refMonth - 1;

  const thisMonth: T[] = [];
  const lastMonth: T[] = [];

  for (const row of rows) {
    if (!row.created_at) continue;
    const d = new Date(row.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    if (y === refYear && m === refMonth) thisMonth.push(row);
    else if (y === lastMonthYear && m === lastMonthIdx) lastMonth.push(row);
  }
  return { thisMonth, lastMonth };
}

/**
 * Construit un MonthlyDelta à partir de deux montants. Retourne
 * `null` direction neutre si la comparaison n'a pas de sens (ex.
 * mois précédent vide ou égalité parfaite).
 *
 * Le percent est arrondi à 1 décimale.
 */
function deltaFromTotals(thisTotal: number, lastTotal: number): MonthlyDelta {
  if (lastTotal === 0 || !Number.isFinite(lastTotal)) {
    return { percent: null, direction: "neutral" };
  }
  const raw = ((thisTotal - lastTotal) / lastTotal) * 100;
  const rounded = Math.round(raw * 10) / 10;
  if (rounded === 0) return { percent: 0, direction: "neutral" };
  return {
    percent: Math.abs(rounded),
    direction: rounded > 0 ? "positive" : "negative",
  };
}

/**
 * Calcule le delta % des revenus du mois en cours vs mois
 * précédent. Les revenus récurrents (frequency != "one_time") sont
 * comptés via `frequencyMultiplier` pour les ramener à leur
 * équivalent mensuel — un revenu annuel de 12 000 CHF compte
 * pour 1 000 CHF/mois dans CHAQUE mois traversé, pas comme une
 * grosse entrée le mois de saisie.
 *
 * NB : `Income` n'a pas de champ `date` standard. On compare donc
 * uniquement les revenus PONCTUELS (frequency === "one_time")
 * datés. Les revenus récurrents sont considérés constants — donc
 * leur contribution s'annule entre les deux mois et on ne compare
 * que les variations ponctuelles. C'est volontaire : sinon le
 * delta serait artificiellement à 0% pour la plupart des users.
 *
 * Si l'utilisateur n'a aucun revenu ponctuel ou aucune donnée
 * historique du mois précédent, on renvoie neutral.
 */
/**
 * Convention LIBERIA : `frequencyMultiplier("one_time") = 0`. Le
 * code finance gère donc les one_time hors `frequencyMultiplier`.
 * Pour la comparaison m vs m-1, on ne s'intéresse QU'aux one_time
 * (les récurrents sont par définition constants — ils s'annulent
 * entre les deux mois). Donc on filtre + somme `amount` brut.
 */

export function computeIncomeMonthlyDelta(
  incomes: Income[],
  referenceDate: Date = new Date(),
): MonthlyDelta {
  const oneTimers = incomes.filter((i) => i.frequency === "one_time");
  const { thisMonth, lastMonth } = splitByMonth(oneTimers, referenceDate);
  const sum = (arr: Income[]) => arr.reduce((s, r) => s + r.amount, 0);
  return deltaFromTotals(sum(thisMonth), sum(lastMonth));
}

/**
 * Calcule le delta % des dépenses du mois en cours vs mois
 * précédent sur les transactions ponctuelles uniquement.
 * Comparaison sur `created_at`.
 */
export function computeExpenseMonthlyDelta(
  expenses: Expense[],
  referenceDate: Date = new Date(),
): MonthlyDelta {
  const oneTimers = expenses.filter((e) => e.frequency === "one_time");
  const { thisMonth, lastMonth } = splitByMonth(oneTimers, referenceDate);
  const sum = (arr: Expense[]) => arr.reduce((s, r) => s + r.amount, 0);
  return deltaFromTotals(sum(thisMonth), sum(lastMonth));
}

/**
 * Reste à vivre = revenus - dépenses. Le delta du reste à vivre
 * est calculé à partir des deux flux séparés (revenus this/last et
 * dépenses this/last), pas en composant les deltas % (qui ne
 * commutent pas). Mêmes principes que les fonctions ci-dessus :
 * on ne considère que les transactions ponctuelles datées.
 */
export function computeRemainderMonthlyDelta(
  incomes: Income[],
  expenses: Expense[],
  referenceDate: Date = new Date(),
): MonthlyDelta {
  const incomeOneTimers = incomes.filter((i) => i.frequency === "one_time");
  const expenseOneTimers = expenses.filter((e) => e.frequency === "one_time");
  const splitIncome = splitByMonth(incomeOneTimers, referenceDate);
  const splitExpense = splitByMonth(expenseOneTimers, referenceDate);
  const sumAmount = <T extends { amount: number }>(arr: T[]) =>
    arr.reduce((s, r) => s + r.amount, 0);
  const thisRemainder =
    sumAmount(splitIncome.thisMonth) - sumAmount(splitExpense.thisMonth);
  const lastRemainder =
    sumAmount(splitIncome.lastMonth) - sumAmount(splitExpense.lastMonth);
  return deltaFromTotals(thisRemainder, lastRemainder);
}
