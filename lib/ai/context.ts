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
import type { UserMemoryEntry } from "@/types/database";

export interface FinanceContextOptions {
  /**
   * Memory entries with kind='goal'. Merged into the "Objectifs
   * actuels" section so the coach treats DB goals AND conversation-
   * extracted goals as a single source of truth. Without this, the
   * coach claimed "aucun objectif actif" even after the user had
   * stated an objective in chat (now persisted in
   * user_memory_entries) — see Phase 2.5 fix.
   */
  memoryGoals?: readonly UserMemoryEntry[];
}

/**
 * Renders the user's finance snapshot as a stable, deterministic markdown
 * block. Goes inside the `system` array right after the static system
 * prompt so the whole block can be cached together when its size crosses
 * the per-model minimum.
 */
export function buildFinanceContext(
  data: FinanceData,
  options: FinanceContextOptions = {},
): string {
  const currency = data.profile.currency || "CHF";
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
  // For the AI context we still want a short qualitative tier — we
  // keep a frozen FR mapping here because Anthropic reads the prompt;
  // user-facing dashboards translate the same `tier.color` via
  // `dashboard.stability.tiers.*`.
  const tier = getStabilityTier(stability);
  const tierLabel = {
    danger: "Tendu",
    warning: "Fragile",
    neutral: "En progression",
    success: "Stable",
    gold: "Solide",
  }[tier.color];

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
      } [source: /goals]`;
    })
    .join("\n");

  // Merge memory-extracted goals into the same section. The coach now
  // sees ONE list of objectives whether they live in the goals table
  // (formal, with amounts and deadlines) or in user_memory_entries
  // (mentioned in conversation but not yet formalised). Both are
  // legitimate user objectives — distinguishing them was the
  // confusing prompt anti-pattern that triggered "aucun objectif
  // actif" responses despite the memory clearly containing goals.
  const memoryGoalsList = (options.memoryGoals ?? [])
    .map((g) => {
      const detail = g.detail ? ` — ${g.detail}` : "";
      return `- ${g.summary}${detail} [source: mémoire conversation, à formaliser dans /goals quand prêt]`;
    })
    .join("\n");

  const goalsSection =
    [goalsList, memoryGoalsList].filter(Boolean).join("\n") ||
    "Aucun objectif actif.";

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
- Score de stabilité : ${stability}/100 — ${tierLabel}
- Stress financier perçu : ${stress}/100

## Top dépenses mensuelles
${expenseByCategory || "Aucune dépense enregistrée."}

## Revenus déclarés
${incomeByLabel || "Aucun revenu enregistré."}

## Objectifs actuels
${goalsSection}

## Règles importantes
- Si tu cites un montant, prends-le dans la liste ci-dessus. N'invente pas.
- Si une donnée manque, demande-la avant d'extrapoler.
- Garde un ton calme et concret.
- "Objectifs actuels" est la source de vérité COMPLÈTE des objectifs : tu y trouves les objectifs formalisés dans /goals ET ceux mentionnés en conversation (étiquetés "source: mémoire conversation"). Ne dis JAMAIS "aucun objectif actif" si cette section liste au moins un élément. Quand un objectif vient de la mémoire sans être encore dans /goals, propose à l'utilisateur de le formaliser (montant cible, échéance) sans le lui imposer.`;
}
