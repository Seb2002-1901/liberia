"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  GOAL_TYPES,
} from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

const expenseCategoryIds = EXPENSE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

/**
 * Validates the payload coming back from the client. The same fields
 * came from Anthropic via tool_use and were already validated against
 * the JSON schema at the SDK level — but the client posts back from
 * the BROWSER, so we re-validate here as if it were untrusted input
 * (because between SSE delivery and the user's click, anything can
 * happen — DOM tampering, custom client, replay).
 */
const proposeExpenseSchema = z.object({
  expense_type: z.enum(["variable_one_time", "fixed_recurring"]),
  frequency: z.enum(["one_time", "monthly", "weekly", "yearly"]),
  amount: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  currency: z
    .string()
    .min(2, "errors.validation.amountInvalid")
    .max(8),
  label: z.string().min(1).max(80),
  category: z.enum(expenseCategoryIds),
  notes: z.string().max(280).nullable().optional(),
});

export type CoachExpensePayload = z.infer<typeof proposeExpenseSchema>;

/**
 * Inserts the coach-proposed expense once the user clicked Confirm
 * on the in-chat card. The frequency comes from the tool input — the
 * coach now distinguishes variable_one_time (a single past
 * transaction) from fixed_recurring (a monthly/yearly recurring
 * line) explicitly. We trust but verify: the schema below enforces
 * the same constraint as the system prompt — variable_one_time MUST
 * be one_time, fixed_recurring MUST NOT be one_time.
 */
export async function confirmProposedExpenseAction(
  input: CoachExpensePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = proposeExpenseSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[coach/propose_expense] validation failed:",
      parsed.error.flatten(),
    );
    return { ok: false, error: tErr("invalidData") };
  }

  // Cross-field invariant: one_time iff variable_one_time. Belt-and-
  // braces — the prompt says the same, but a misbehaving model
  // shouldn't be able to log a "fixed one_time" or a "variable
  // monthly" row that would confuse the analytics buckets.
  const isOneTime = parsed.data.frequency === "one_time";
  const isVariable = parsed.data.expense_type === "variable_one_time";
  if (isOneTime !== isVariable) {
    console.error(
      `[coach/propose_expense] type/frequency mismatch: ${parsed.data.expense_type}/${parsed.data.frequency}`,
    );
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    label: parsed.data.label,
    amount: parsed.data.amount,
    category: parsed.data.category,
    frequency: parsed.data.frequency,
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    console.error(
      `[coach/propose_expense] insert failed: ${error.code ?? "?"} ${error.message}`,
    );
    return { ok: false, error: error.message };
  }

  // The user expects the dashboard to reflect this immediately.
  // Revalidate every surface that aggregates expenses.
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  // /coach also reads finance data into the prompt — refresh so the
  // next coach reply sees the new line in the financeContext block.
  revalidatePath("/coach");

  console.log(
    `[coach/propose_expense] inserted: ${parsed.data.amount} ${parsed.data.currency} ${parsed.data.label} (${parsed.data.category})`,
  );

  return { ok: true };
}

/* ════════════════════════════════════════════════════════════
 * Sprint Coach IA — confirmations des 3 nouvelles tools.
 * Mêmes invariants : auth obligatoire, validation Zod côté
 * serveur (les inputs ont déjà été validés par le SDK Anthropic
 * mais on re-valide ici car ils ont transité par le browser et
 * sont donc reçus comme "non-trusted").
 * ════════════════════════════════════════════════════════════ */

const incomeCategoryIds = INCOME_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];
const goalTypeIds = GOAL_TYPES.map((g) => g.id) as [string, ...string[]];

const proposeIncomeSchema = z.object({
  frequency: z.enum(["one_time", "monthly", "weekly", "yearly"]),
  amount: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  currency: z.string().min(2).max(8),
  label: z.string().min(1).max(80),
  category: z.enum(incomeCategoryIds),
  notes: z.string().max(280).nullable().optional(),
});

export type CoachIncomePayload = z.infer<typeof proposeIncomeSchema>;

export async function confirmProposedIncomeAction(
  input: CoachIncomePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = proposeIncomeSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[coach/propose_income] validation failed:",
      parsed.error.flatten(),
    );
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase.from("incomes").insert({
    user_id: user.id,
    label: parsed.data.label,
    amount: parsed.data.amount,
    category: parsed.data.category,
    frequency: parsed.data.frequency,
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    console.error(
      `[coach/propose_income] insert failed: ${error.code ?? "?"} ${error.message}`,
    );
    return { ok: false, error: error.message };
  }

  revalidatePath("/incomes");
  revalidatePath("/design-match/revenus-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/budget");
  revalidatePath("/coach");

  console.log(
    `[coach/propose_income] inserted: ${parsed.data.amount} ${parsed.data.currency} ${parsed.data.label} (${parsed.data.category})`,
  );
  return { ok: true };
}

const proposeGoalSchema = z.object({
  title: z.string().min(1).max(80),
  type: z.enum(goalTypeIds),
  targetAmount: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000),
  currentAmount: z
    .number()
    .min(0)
    .max(10_000_000)
    .optional()
    .nullable(),
  currency: z.string().min(2).max(8),
  // ISO YYYY-MM-DD. Anthropic peut renvoyer une chaîne vide ; on tolère.
  deadline: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "errors.validation.dateInvalid",
    ),
  notes: z.string().max(280).nullable().optional(),
});

export type CoachGoalPayload = z.infer<typeof proposeGoalSchema>;

export async function confirmProposedGoalAction(
  input: CoachGoalPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = proposeGoalSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[coach/propose_goal] validation failed:", parsed.error.flatten());
    return { ok: false, error: tErr("invalidData") };
  }

  // Garde anti-régression — currentAmount ne peut pas dépasser targetAmount.
  const currentAmount = parsed.data.currentAmount ?? 0;
  if (currentAmount > parsed.data.targetAmount) {
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.data.title,
    type: parsed.data.type,
    target_amount: parsed.data.targetAmount,
    current_amount: currentAmount,
    deadline: parsed.data.deadline || null,
    notes: parsed.data.notes ?? null,
    is_completed: false,
  });

  if (error) {
    console.error(
      `[coach/propose_goal] insert failed: ${error.code ?? "?"} ${error.message}`,
    );
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/design-match/objectifs-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/coach");

  console.log(
    `[coach/propose_goal] inserted: ${parsed.data.title} target=${parsed.data.targetAmount} ${parsed.data.currency}`,
  );
  return { ok: true };
}

const proposeBudgetSchema = z.object({
  category: z.enum(expenseCategoryIds),
  monthlyLimit: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000),
  currency: z.string().min(2).max(8),
});

export type CoachBudgetPayload = z.infer<typeof proposeBudgetSchema>;

export async function confirmProposedBudgetAction(
  input: CoachBudgetPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = proposeBudgetSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[coach/propose_budget] validation failed:", parsed.error.flatten());
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  // Upsert : un seul cap par (user, category) — la table category_budgets
  // a un index unique (user_id, category) (cf. schema.sql). On utilise
  // onConflict pour respecter cette contrainte.
  const { error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: user.id,
        category: parsed.data.category,
        monthly_limit: parsed.data.monthlyLimit,
      },
      { onConflict: "user_id,category" },
    );

  if (error) {
    console.error(
      `[coach/propose_budget] upsert failed: ${error.code ?? "?"} ${error.message}`,
    );
    return { ok: false, error: error.message };
  }

  revalidatePath("/budget");
  revalidatePath("/design-match/budget-v3");
  revalidatePath("/expenses/analytics");
  revalidatePath("/dashboard");
  revalidatePath("/coach");

  console.log(
    `[coach/propose_budget] upserted: ${parsed.data.category} = ${parsed.data.monthlyLimit} ${parsed.data.currency}`,
  );
  return { ok: true };
}

/* ════════════════════════════════════════════════════════════
 * Sprint Advisor V3 — update / delete goal.
 *
 * Le coach passe le `match_title` (texte fourni par l'utilisateur),
 * on cherche le goal du user qui matche. Si 0 match → notFound,
 * si plusieurs → ambiguity (le coach demandera plus de précision
 * au tour suivant), si 1 → update/delete.
 * ════════════════════════════════════════════════════════════ */

const updateGoalSchema = z.object({
  match_title: z.string().min(1).max(120),
  newTargetAmount: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000)
    .optional(),
  newCurrentAmount: z.number().min(0).max(10_000_000).optional(),
  newDeadline: z
    .string()
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "errors.validation.dateInvalid",
    ),
  newTitle: z.string().min(1).max(80).optional(),
  currency: z.string().min(2).max(8),
});

export type CoachUpdateGoalPayload = z.infer<typeof updateGoalSchema>;

export async function confirmProposedUpdateGoalAction(
  input: CoachUpdateGoalPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[coach/propose_update_goal] validation failed:",
      parsed.error.flatten(),
    );
    return { ok: false, error: tErr("invalidData") };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  // Lookup ILIKE — case-insensitive substring match. Si plusieurs
  // matches : on remonte ambiguity. Si zéro : notFound.
  const { data: matches, error: lookupError } = await supabase
    .from("goals")
    .select("id, title, target_amount, current_amount")
    .eq("user_id", user.id)
    .ilike("title", `%${parsed.data.match_title}%`)
    .limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: tErr("goalNotFound") };
  }
  if (matches.length > 1) {
    return { ok: false, error: tErr("goalAmbiguous") };
  }

  const existing = matches[0] as {
    id: string;
    title: string;
    target_amount: number;
    current_amount: number;
  };

  // Construit le patch en respectant l'invariant currentAmount <= target.
  const nextTarget =
    parsed.data.newTargetAmount ?? existing.target_amount;
  const nextCurrent =
    parsed.data.newCurrentAmount ?? existing.current_amount;
  if (nextCurrent > nextTarget) {
    return { ok: false, error: tErr("invalidData") };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.newTargetAmount !== undefined)
    patch.target_amount = parsed.data.newTargetAmount;
  if (parsed.data.newCurrentAmount !== undefined)
    patch.current_amount = parsed.data.newCurrentAmount;
  if (parsed.data.newDeadline !== undefined)
    patch.deadline = parsed.data.newDeadline || null;
  if (parsed.data.newTitle !== undefined) patch.title = parsed.data.newTitle;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: tErr("invalidData") };
  }

  const { error: updateError } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/goals");
  revalidatePath("/design-match/objectifs-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/coach");

  console.log(
    `[coach/propose_update_goal] updated: ${existing.title} patch=${JSON.stringify(patch)}`,
  );
  return { ok: true };
}

const deleteGoalSchema = z.object({
  match_title: z.string().min(1).max(120),
});

export type CoachDeleteGoalPayload = z.infer<typeof deleteGoalSchema>;

export async function confirmProposedDeleteGoalAction(
  input: CoachDeleteGoalPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = deleteGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { data: matches, error: lookupError } = await supabase
    .from("goals")
    .select("id, title")
    .eq("user_id", user.id)
    .ilike("title", `%${parsed.data.match_title}%`)
    .limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: tErr("goalNotFound") };
  }
  if (matches.length > 1) {
    return { ok: false, error: tErr("goalAmbiguous") };
  }

  const existing = matches[0] as { id: string; title: string };

  const { error: deleteError } = await supabase
    .from("goals")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/goals");
  revalidatePath("/design-match/objectifs-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/coach");

  console.log(
    `[coach/propose_delete_goal] deleted: ${existing.title} (${existing.id})`,
  );
  return { ok: true };
}

/* ════════════════════════════════════════════════════════════
 * Sprint Iris V4 — Update/Delete expenses + incomes + budget
 * + memory write + plan step toggle.
 * ════════════════════════════════════════════════════════════ */

const incomeFrequencyEnum = ["one_time", "monthly", "weekly", "yearly"] as const;

const updateExpenseSchema = z.object({
  match_label: z.string().min(1).max(120),
  match_category: z.enum(expenseCategoryIds).optional(),
  newAmount: z.number().positive().max(10_000_000).optional(),
  newFrequency: z.enum(incomeFrequencyEnum).optional(),
  newCategory: z.enum(expenseCategoryIds).optional(),
  newLabel: z.string().min(1).max(80).optional(),
  currency: z.string().min(2).max(8),
});

export type CoachUpdateExpensePayload = z.infer<typeof updateExpenseSchema>;

export async function confirmProposedUpdateExpenseAction(
  input: CoachUpdateExpensePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = updateExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  let query = supabase
    .from("expenses")
    .select("id, label, amount, category, frequency")
    .eq("user_id", user.id)
    .ilike("label", `%${parsed.data.match_label}%`);
  if (parsed.data.match_category) {
    query = query.eq("category", parsed.data.match_category);
  }
  const { data: matches, error: lookupError } = await query.limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0) {
    return { ok: false, error: tErr("expenseNotFound") };
  }
  if (matches.length > 1) {
    return { ok: false, error: tErr("expenseAmbiguous") };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.newAmount !== undefined) patch.amount = parsed.data.newAmount;
  if (parsed.data.newFrequency !== undefined)
    patch.frequency = parsed.data.newFrequency;
  if (parsed.data.newCategory !== undefined)
    patch.category = parsed.data.newCategory;
  if (parsed.data.newLabel !== undefined) patch.label = parsed.data.newLabel;
  if (Object.keys(patch).length === 0)
    return { ok: false, error: tErr("invalidData") };

  const existing = matches[0] as { id: string; label: string };
  const { error: updateError } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/expenses");
  revalidatePath("/design-match/depenses-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/budget");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_update_expense] updated: ${existing.label} patch=${JSON.stringify(patch)}`,
  );
  return { ok: true };
}

const deleteExpenseSchema = z.object({
  match_label: z.string().min(1).max(120),
  match_category: z.enum(expenseCategoryIds).optional(),
});

export type CoachDeleteExpensePayload = z.infer<typeof deleteExpenseSchema>;

export async function confirmProposedDeleteExpenseAction(
  input: CoachDeleteExpensePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = deleteExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  let query = supabase
    .from("expenses")
    .select("id, label")
    .eq("user_id", user.id)
    .ilike("label", `%${parsed.data.match_label}%`);
  if (parsed.data.match_category) {
    query = query.eq("category", parsed.data.match_category);
  }
  const { data: matches, error: lookupError } = await query.limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0)
    return { ok: false, error: tErr("expenseNotFound") };
  if (matches.length > 1)
    return { ok: false, error: tErr("expenseAmbiguous") };

  const existing = matches[0] as { id: string; label: string };
  const { error: deleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/expenses");
  revalidatePath("/design-match/depenses-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/budget");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_delete_expense] deleted: ${existing.label} (${existing.id})`,
  );
  return { ok: true };
}

const updateIncomeSchema = z.object({
  match_label: z.string().min(1).max(120),
  match_category: z.enum(incomeCategoryIds).optional(),
  newAmount: z.number().positive().max(10_000_000).optional(),
  newFrequency: z.enum(incomeFrequencyEnum).optional(),
  newLabel: z.string().min(1).max(80).optional(),
  currency: z.string().min(2).max(8),
});

export type CoachUpdateIncomePayload = z.infer<typeof updateIncomeSchema>;

export async function confirmProposedUpdateIncomeAction(
  input: CoachUpdateIncomePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = updateIncomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  let query = supabase
    .from("incomes")
    .select("id, label, amount, category, frequency")
    .eq("user_id", user.id)
    .ilike("label", `%${parsed.data.match_label}%`);
  if (parsed.data.match_category) {
    query = query.eq("category", parsed.data.match_category);
  }
  const { data: matches, error: lookupError } = await query.limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0)
    return { ok: false, error: tErr("incomeNotFound") };
  if (matches.length > 1)
    return { ok: false, error: tErr("incomeAmbiguous") };

  const patch: Record<string, unknown> = {};
  if (parsed.data.newAmount !== undefined) patch.amount = parsed.data.newAmount;
  if (parsed.data.newFrequency !== undefined)
    patch.frequency = parsed.data.newFrequency;
  if (parsed.data.newLabel !== undefined) patch.label = parsed.data.newLabel;
  if (Object.keys(patch).length === 0)
    return { ok: false, error: tErr("invalidData") };

  const existing = matches[0] as { id: string; label: string };
  const { error: updateError } = await supabase
    .from("incomes")
    .update(patch)
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/incomes");
  revalidatePath("/design-match/revenus-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_update_income] updated: ${existing.label} patch=${JSON.stringify(patch)}`,
  );
  return { ok: true };
}

const deleteIncomeSchema = z.object({
  match_label: z.string().min(1).max(120),
  match_category: z.enum(incomeCategoryIds).optional(),
});

export type CoachDeleteIncomePayload = z.infer<typeof deleteIncomeSchema>;

export async function confirmProposedDeleteIncomeAction(
  input: CoachDeleteIncomePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = deleteIncomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  let query = supabase
    .from("incomes")
    .select("id, label")
    .eq("user_id", user.id)
    .ilike("label", `%${parsed.data.match_label}%`);
  if (parsed.data.match_category) {
    query = query.eq("category", parsed.data.match_category);
  }
  const { data: matches, error: lookupError } = await query.limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0)
    return { ok: false, error: tErr("incomeNotFound") };
  if (matches.length > 1)
    return { ok: false, error: tErr("incomeAmbiguous") };

  const existing = matches[0] as { id: string; label: string };
  const { error: deleteError } = await supabase
    .from("incomes")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/incomes");
  revalidatePath("/design-match/revenus-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_delete_income] deleted: ${existing.label} (${existing.id})`,
  );
  return { ok: true };
}

const deleteBudgetSchema = z.object({
  category: z.enum(expenseCategoryIds),
});

export type CoachDeleteBudgetPayload = z.infer<typeof deleteBudgetSchema>;

export async function confirmProposedDeleteBudgetAction(
  input: CoachDeleteBudgetPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = deleteBudgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error: deleteError } = await supabase
    .from("category_budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category", parsed.data.category);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/budget");
  revalidatePath("/design-match/budget-v3");
  revalidatePath("/expenses/analytics");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  console.log(`[coach/propose_delete_budget] removed cap for ${parsed.data.category}`);
  return { ok: true };
}

const addMemorySchema = z.object({
  kind: z.enum(["goal", "constraint", "preference", "context", "event"]),
  summary: z.string().min(3).max(280),
});

export type CoachAddMemoryPayload = z.infer<typeof addMemorySchema>;

export async function confirmProposedAddMemoryAction(
  input: CoachAddMemoryPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = addMemorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error: insertError } = await supabase
    .from("user_memory_entries")
    .insert({
      user_id: user.id,
      kind: parsed.data.kind,
      summary: parsed.data.summary,
      // archived_at default null
    });
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/settings/memory");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_add_memory] saved (${parsed.data.kind}): ${parsed.data.summary.slice(0, 60)}`,
  );
  return { ok: true };
}

const deleteMemorySchema = z.object({
  match_summary: z.string().min(1).max(280),
});

export type CoachDeleteMemoryPayload = z.infer<typeof deleteMemorySchema>;

export async function confirmProposedDeleteMemoryAction(
  input: CoachDeleteMemoryPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = deleteMemorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { data: matches, error: lookupError } = await supabase
    .from("user_memory_entries")
    .select("id, summary")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .ilike("summary", `%${parsed.data.match_summary}%`)
    .limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0)
    return { ok: false, error: tErr("memoryNotFound") };
  if (matches.length > 1)
    return { ok: false, error: tErr("memoryAmbiguous") };

  const existing = matches[0] as { id: string; summary: string };
  // Soft-delete : archive plutôt que delete dur. Le user peut désarchiver
  // depuis /settings/memory si regret.
  const { error: updateError } = await supabase
    .from("user_memory_entries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/settings/memory");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_delete_memory] archived: ${existing.summary.slice(0, 60)}`,
  );
  return { ok: true };
}

const togglePlanStepSchema = z.object({
  match_query: z.string().min(1).max(120),
  completed: z.boolean(),
});

export type CoachTogglePlanStepPayload = z.infer<typeof togglePlanStepSchema>;

export async function confirmProposedTogglePlanStepAction(
  input: CoachTogglePlanStepPayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = togglePlanStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tErr("invalidData") };
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  // Lookup matching step by title OR focus ILIKE. Only consider steps
  // attached to plans owned by the user (via user_id column on steps).
  const { data: matches, error: lookupError } = await supabase
    .from("financial_plan_steps")
    .select("id, title, focus")
    .eq("user_id", user.id)
    .or(
      `title.ilike.%${parsed.data.match_query}%,focus.ilike.%${parsed.data.match_query}%`,
    )
    .limit(5);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0)
    return { ok: false, error: tErr("planStepNotFound") };
  if (matches.length > 1)
    return { ok: false, error: tErr("planStepAmbiguous") };

  const existing = matches[0] as { id: string; title: string };
  const { error: updateError } = await supabase
    .from("financial_plan_steps")
    .update({
      is_completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })
    .eq("id", existing.id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/plan");
  revalidatePath("/design-match/plan-v3");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  console.log(
    `[coach/propose_toggle_plan_step] ${parsed.data.completed ? "completed" : "uncompleted"}: ${existing.title}`,
  );
  return { ok: true };
}
