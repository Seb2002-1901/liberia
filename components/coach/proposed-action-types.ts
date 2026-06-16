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

export interface PendingUpdateExpenseAction {
  kind: "update_expense";
  toolUseId: string;
  match_label: string;
  match_category: ExpenseCategoryId | null;
  newAmount: number | null;
  newFrequency: ExpenseFrequency | null;
  newCategory: ExpenseCategoryId | null;
  newLabel: string | null;
  currency: string;
}

export interface PendingDeleteExpenseAction {
  kind: "delete_expense";
  toolUseId: string;
  match_label: string;
  match_category: ExpenseCategoryId | null;
}

export interface PendingUpdateIncomeAction {
  kind: "update_income";
  toolUseId: string;
  match_label: string;
  match_category: IncomeCategoryId | null;
  newAmount: number | null;
  newFrequency: ExpenseFrequency | null;
  newLabel: string | null;
  currency: string;
}

export interface PendingDeleteIncomeAction {
  kind: "delete_income";
  toolUseId: string;
  match_label: string;
  match_category: IncomeCategoryId | null;
}

export interface PendingDeleteBudgetAction {
  kind: "delete_budget";
  toolUseId: string;
  category: ExpenseCategoryId;
}

export type MemoryKind = "goal" | "constraint" | "preference" | "context" | "event";

export interface PendingAddMemoryAction {
  kind: "add_memory";
  toolUseId: string;
  memoryKind: MemoryKind;
  summary: string;
}

export interface PendingDeleteMemoryAction {
  kind: "delete_memory";
  toolUseId: string;
  match_summary: string;
}

export interface PendingTogglePlanStepAction {
  kind: "toggle_plan_step";
  toolUseId: string;
  match_query: string;
  completed: boolean;
}

export type PendingAction =
  | PendingExpenseAction
  | PendingIncomeAction
  | PendingGoalAction
  | PendingBudgetAction
  | PendingUpdateGoalAction
  | PendingDeleteGoalAction
  | PendingUpdateExpenseAction
  | PendingDeleteExpenseAction
  | PendingUpdateIncomeAction
  | PendingDeleteIncomeAction
  | PendingDeleteBudgetAction
  | PendingAddMemoryAction
  | PendingDeleteMemoryAction
  | PendingTogglePlanStepAction;

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

  if (event === "propose_update_expense") {
    if (typeof payload.match_label !== "string" || payload.match_label.length === 0)
      return null;
    if (typeof payload.currency !== "string") return null;
    const newAmount =
      typeof payload.newAmount === "number" && payload.newAmount > 0
        ? payload.newAmount
        : null;
    const newFrequency = isFrequency(payload.newFrequency)
      ? payload.newFrequency
      : null;
    const newCategory =
      typeof payload.newCategory === "string" ? (payload.newCategory as ExpenseCategoryId) : null;
    const newLabel =
      typeof payload.newLabel === "string" && payload.newLabel.length > 0
        ? payload.newLabel
        : null;
    if (newAmount === null && newFrequency === null && newCategory === null && newLabel === null)
      return null;
    return {
      kind: "update_expense",
      toolUseId,
      match_label: payload.match_label,
      match_category:
        typeof payload.match_category === "string"
          ? (payload.match_category as ExpenseCategoryId)
          : null,
      newAmount,
      newFrequency,
      newCategory,
      newLabel,
      currency: payload.currency,
    };
  }

  if (event === "propose_delete_expense") {
    if (typeof payload.match_label !== "string" || payload.match_label.length === 0)
      return null;
    return {
      kind: "delete_expense",
      toolUseId,
      match_label: payload.match_label,
      match_category:
        typeof payload.match_category === "string"
          ? (payload.match_category as ExpenseCategoryId)
          : null,
    };
  }

  if (event === "propose_update_income") {
    if (typeof payload.match_label !== "string" || payload.match_label.length === 0)
      return null;
    if (typeof payload.currency !== "string") return null;
    const newAmount =
      typeof payload.newAmount === "number" && payload.newAmount > 0
        ? payload.newAmount
        : null;
    const newFrequency = isFrequency(payload.newFrequency)
      ? payload.newFrequency
      : null;
    const newLabel =
      typeof payload.newLabel === "string" && payload.newLabel.length > 0
        ? payload.newLabel
        : null;
    if (newAmount === null && newFrequency === null && newLabel === null) return null;
    return {
      kind: "update_income",
      toolUseId,
      match_label: payload.match_label,
      match_category:
        typeof payload.match_category === "string"
          ? (payload.match_category as IncomeCategoryId)
          : null,
      newAmount,
      newFrequency,
      newLabel,
      currency: payload.currency,
    };
  }

  if (event === "propose_delete_income") {
    if (typeof payload.match_label !== "string" || payload.match_label.length === 0)
      return null;
    return {
      kind: "delete_income",
      toolUseId,
      match_label: payload.match_label,
      match_category:
        typeof payload.match_category === "string"
          ? (payload.match_category as IncomeCategoryId)
          : null,
    };
  }

  if (event === "propose_delete_budget") {
    if (typeof payload.category !== "string") return null;
    return {
      kind: "delete_budget",
      toolUseId,
      category: payload.category as ExpenseCategoryId,
    };
  }

  if (event === "propose_add_memory") {
    if (
      typeof payload.summary !== "string" ||
      payload.summary.length < 3
    )
      return null;
    const kind = payload.kind;
    if (
      kind !== "goal" &&
      kind !== "constraint" &&
      kind !== "preference" &&
      kind !== "context" &&
      kind !== "event"
    )
      return null;
    return {
      kind: "add_memory",
      toolUseId,
      memoryKind: kind,
      summary: payload.summary,
    };
  }

  if (event === "propose_delete_memory") {
    if (
      typeof payload.match_summary !== "string" ||
      payload.match_summary.length === 0
    )
      return null;
    return {
      kind: "delete_memory",
      toolUseId,
      match_summary: payload.match_summary,
    };
  }

  if (event === "propose_toggle_plan_step") {
    if (typeof payload.match_query !== "string" || payload.match_query.length === 0)
      return null;
    if (typeof payload.completed !== "boolean") return null;
    return {
      kind: "toggle_plan_step",
      toolUseId,
      match_query: payload.match_query,
      completed: payload.completed,
    };
  }

  return null;
}

function isFrequency(v: unknown): v is ExpenseFrequency {
  return (
    v === "one_time" || v === "monthly" || v === "weekly" || v === "yearly"
  );
}
