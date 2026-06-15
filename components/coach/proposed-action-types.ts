/**
 * Sprint Coach IA — discriminated union des actions proposées par le
 * coach via tool_use Anthropic. Chaque variante correspond à un
 * SSE event (propose_expense / propose_income / propose_goal /
 * propose_budget) émis par /api/ai/chat.
 *
 * Pas server-only : ces types vivent côté client (carte de confirm)
 * et serveur (route /api/ai/chat + server actions). Pas d'import
 * lourd ici — uniquement les types des constantes.
 */

import type {
  ExpenseCategoryId,
  IncomeCategoryId,
  GoalTypeId,
} from "@/lib/constants";

export type ExpenseFrequency =
  | "one_time"
  | "monthly"
  | "weekly"
  | "yearly";

export interface PendingExpenseAction {
  kind: "expense";
  toolUseId: string;
  expense_type: "variable_one_time" | "fixed_recurring";
  frequency: ExpenseFrequency;
  amount: number;
  currency: string;
  label: string;
  category: ExpenseCategoryId;
  notes: string | null;
}

export interface PendingIncomeAction {
  kind: "income";
  toolUseId: string;
  frequency: ExpenseFrequency;
  amount: number;
  currency: string;
  label: string;
  category: IncomeCategoryId;
  notes: string | null;
}

export interface PendingGoalAction {
  kind: "goal";
  toolUseId: string;
  title: string;
  type: GoalTypeId;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  notes: string | null;
}

export interface PendingBudgetAction {
  kind: "budget";
  toolUseId: string;
  category: ExpenseCategoryId;
  monthlyLimit: number;
  currency: string;
}

export interface PendingUpdateGoalAction {
  kind: "update_goal";
  toolUseId: string;
  match_title: string;
  newTargetAmount: number | null;
  newCurrentAmount: number | null;
  newDeadline: string | null;
  newTitle: string | null;
  currency: string;
}

export interface PendingDeleteGoalAction {
  kind: "delete_goal";
  toolUseId: string;
  match_title: string;
}

export type PendingAction =
  | PendingExpenseAction
  | PendingIncomeAction
  | PendingGoalAction
  | PendingBudgetAction
  | PendingUpdateGoalAction
  | PendingDeleteGoalAction;

/**
 * Parse un payload SSE inconnu en PendingAction typée. Retourne
 * `null` si le payload ne matche aucun schéma (un attacker pourrait
 * en théorie injecter, même si le SSE vient de notre propre route).
 *
 * Volontairement permissif sur les champs optionnels (notes, deadline,
 * currentAmount) pour que la moindre variation du modèle ne casse pas
 * le rendu de la carte.
 */
export function parseSseProposedAction(
  event: string,
  payload: Record<string, unknown>,
): PendingAction | null {
  const toolUseId =
    typeof payload.toolUseId === "string" ? payload.toolUseId : null;
  if (!toolUseId) return null;

  if (event === "propose_expense") {
    const expense_type = payload.expense_type;
    const frequency = payload.frequency;
    if (
      expense_type !== "variable_one_time" &&
      expense_type !== "fixed_recurring"
    )
      return null;
    if (!isFrequency(frequency)) return null;
    if (typeof payload.amount !== "number" || payload.amount <= 0) return null;
    if (typeof payload.currency !== "string") return null;
    if (typeof payload.label !== "string" || payload.label.length === 0)
      return null;
    if (typeof payload.category !== "string") return null;
    return {
      kind: "expense",
      toolUseId,
      expense_type,
      frequency,
      amount: payload.amount,
      currency: payload.currency,
      label: payload.label,
      category: payload.category as ExpenseCategoryId,
      notes: typeof payload.notes === "string" ? payload.notes : null,
    };
  }

  if (event === "propose_income") {
    const frequency = payload.frequency;
    if (!isFrequency(frequency)) return null;
    if (typeof payload.amount !== "number" || payload.amount <= 0) return null;
    if (typeof payload.currency !== "string") return null;
    if (typeof payload.label !== "string" || payload.label.length === 0)
      return null;
    if (typeof payload.category !== "string") return null;
    return {
      kind: "income",
      toolUseId,
      frequency,
      amount: payload.amount,
      currency: payload.currency,
      label: payload.label,
      category: payload.category as IncomeCategoryId,
      notes: typeof payload.notes === "string" ? payload.notes : null,
    };
  }

  if (event === "propose_goal") {
    if (typeof payload.title !== "string" || payload.title.length === 0)
      return null;
    if (typeof payload.type !== "string") return null;
    if (typeof payload.targetAmount !== "number" || payload.targetAmount <= 0)
      return null;
    if (typeof payload.currency !== "string") return null;
    return {
      kind: "goal",
      toolUseId,
      title: payload.title,
      type: payload.type as GoalTypeId,
      targetAmount: payload.targetAmount,
      currentAmount:
        typeof payload.currentAmount === "number" ? payload.currentAmount : 0,
      currency: payload.currency,
      deadline:
        typeof payload.deadline === "string" ? payload.deadline : null,
      notes: typeof payload.notes === "string" ? payload.notes : null,
    };
  }

  if (event === "propose_budget") {
    if (typeof payload.category !== "string") return null;
    if (typeof payload.monthlyLimit !== "number" || payload.monthlyLimit <= 0)
      return null;
    if (typeof payload.currency !== "string") return null;
    return {
      kind: "budget",
      toolUseId,
      category: payload.category as ExpenseCategoryId,
      monthlyLimit: payload.monthlyLimit,
      currency: payload.currency,
    };
  }

  if (event === "propose_update_goal") {
    if (
      typeof payload.match_title !== "string" ||
      payload.match_title.length === 0
    )
      return null;
    if (typeof payload.currency !== "string") return null;
    const newTargetAmount =
      typeof payload.newTargetAmount === "number" && payload.newTargetAmount > 0
        ? payload.newTargetAmount
        : null;
    const newCurrentAmount =
      typeof payload.newCurrentAmount === "number" &&
      payload.newCurrentAmount >= 0
        ? payload.newCurrentAmount
        : null;
    const newDeadline =
      typeof payload.newDeadline === "string" && payload.newDeadline.length > 0
        ? payload.newDeadline
        : null;
    const newTitle =
      typeof payload.newTitle === "string" && payload.newTitle.length > 0
        ? payload.newTitle
        : null;
    // Reject no-op (rien à changer)
    if (
      newTargetAmount === null &&
      newCurrentAmount === null &&
      newDeadline === null &&
      newTitle === null
    )
      return null;
    return {
      kind: "update_goal",
      toolUseId,
      match_title: payload.match_title,
      newTargetAmount,
      newCurrentAmount,
      newDeadline,
      newTitle,
      currency: payload.currency,
    };
  }

  if (event === "propose_delete_goal") {
    if (
      typeof payload.match_title !== "string" ||
      payload.match_title.length === 0
    )
      return null;
    return {
      kind: "delete_goal",
      toolUseId,
      match_title: payload.match_title,
    };
  }

  return null;
}

function isFrequency(v: unknown): v is ExpenseFrequency {
  return (
    v === "one_time" || v === "monthly" || v === "weekly" || v === "yearly"
  );
}
