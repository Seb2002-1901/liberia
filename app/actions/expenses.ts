"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/finance";
import { getActionErrors } from "@/lib/i18n/action-errors";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequiredDemo") };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    user_id: userId,
    label: parsed.data.label,
    amount: parsed.data.amount,
    category: parsed.data.category,
    frequency: parsed.data.frequency,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      label: parsed.data.label,
      amount: parsed.data.amount,
      category: parsed.data.category,
      frequency: parsed.data.frequency,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}


export async function bulkCreateExpensesAction(
  inputs: ExpenseInput[],
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  // Phase 3.1.5 — completion assistant batch insert. We validate
  // EACH row through the same schema as the single-create path, so
  // a malformed payload from the client cannot bypass the bounds.
  // A single failed row aborts the whole batch — the user sees one
  // error rather than a partially-applied state.
  const parsed = inputs.map((i) => expenseSchema.safeParse(i));
  const bad = parsed.find((p) => !p.success);
  if (bad && !bad.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequiredDemo") };

  const supabase = await createClient();
  const rows = parsed.map((p) => {
    const v = (p as { success: true; data: ExpenseInput }).data;
    return {
      user_id: userId,
      label: v.label,
      amount: v.amount,
      category: v.category,
      frequency: v.frequency,
      notes: v.notes ?? null,
    };
  });
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from("expenses").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/expenses/analytics");
  revalidatePath("/coach");
  return { ok: true };
}
