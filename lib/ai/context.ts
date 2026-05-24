import "server-only";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
  calculateStabilityScore,
  getStabilityTier,
} from "@/lib/calculations/finance";
import { EXPENSE_CATEGORIES, GOAL_TYPES, INCOME_CATEGORIES } from "@/lib/constants";
import { totalMonthly } from "@/lib/services/finance";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { FinanceData } from "@/lib/services/finance";

/**
 * Renders the user's finance snapshot as a stable, deterministic markdown
 * block. Goes inside the `system` array right after the static system
 * prompt so the whole block can be cached together when its size crosses
 * the per-model minimum.
 */
export function buildFinanceContext(data: FinanceData): string {
  const currency = data.profile.currency || "EUR";
  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const monthlyExpenses =
    totalMonthly(data.expenses) || data.financialProfile?.monthly_expenses || 0;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const monthlyDebt = data.financialProfile?.monthly_debt ?? 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });
  const stability = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: data.financialProfile?.perceived_stress ?? 3,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });
  const tier = getStabilityTier(stability);

  const fmt = (n: number) => formatCurrency(n, currency);

  const expenseByCategory = aggregateMonthlyByCategory(data.expenses)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((row) => {
      const label =
        EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ?? row.category;
      const pct = monthlyExpenses > 0 ? (row.total / monthlyExpenses) * 100 : 0;
      return `- ${label} : ${fmt(row.total)} (${pct.toFixed(0)}%)`;
    })
    .join("\n");

  const incomeByLabel = data.incomes
    .slice(0, 6)
    .map((i) => {
      const cat =
        INCOME_CATEGORIES.find((c) => c.id === i.category)?.label ?? i.category;
      return `- ${i.label} (${cat}, ${i.frequency}) : ${fmt(i.amount)}`;
    })
    .join("\n");

  const goalsList = data.goals
    .slice(0, 6)
    .map((g) => {
      const typeLabel = GOAL_TYPES.find((t) => t.id === g.type)?.label ?? g.type;
      const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      return `- ${g.title} (${typeLabel}) : ${fmt(g.current_amount)} / ${fmt(g.target_amount)} — ${progress.toFixed(0)}%${
        g.is_completed ? " — terminé" : ""
      }`;
    })
    .join("\n");

  return `# Contexte financier de l'utilisateur

Devise : ${currency}
Mode : ${data.isDemo ? "démo (données fictives)" : "réel"}

## Indicateurs clés
- Revenus mensuels : ${fmt(monthlyIncome)}
- Dépenses mensuelles : ${fmt(monthlyExpenses)}
- Reste à vivre : ${fmt(cashflow)}
- Taux d'épargne : ${formatPercent(savingsRate)}
- Ratio dépenses / revenus : ${formatPercent(expenseRatio)}
- Épargne disponible : ${fmt(currentSavings)}
- Fonds d'urgence : ${Number.isFinite(runway) ? `${runway.toFixed(1)} mois de dépenses` : "couvert au-delà de 12 mois"}
- Remboursement crédit mensuel : ${fmt(monthlyDebt)} (DTI ${formatPercent(dti)})
- Score de stabilité : ${stability}/100 — ${tier.label}
- Stress financier perçu : ${stress}/100

## Top dépenses mensuelles
${expenseByCategory || "Aucune dépense enregistrée."}

## Revenus déclarés
${incomeByLabel || "Aucun revenu enregistré."}

## Objectifs en cours
${goalsList || "Aucun objectif actif."}

## Règles importantes
- Si tu cites un montant, prends-le dans la liste ci-dessus. N'invente pas.
- Si une donnée manque, demande-la avant d'extrapoler.
- Garde un ton calme et concret.`;
}
