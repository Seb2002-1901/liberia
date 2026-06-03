"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { incomeSchema, type IncomeInput } from "@/lib/validations/finance";
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

export async function createIncome(input: IncomeInput): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }

  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: tErr("authRequiredDemo") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("incomes").insert({
    user_id: userId,
    label: parsed.data.label,
    amount: parsed.data.amount,
    category: parsed.data.category,
    frequency: parsed.data.frequency,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}

export async function updateIncome(id: string, input: IncomeInput): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("incomes")
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
  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("incomes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { ok: true };
}
