"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { goalSchema, type GoalInput } from "@/lib/validations/finance";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createGoal(input: GoalInput): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise (ou mode démo)." };

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    title: parsed.data.title,
    type: parsed.data.type,
    target_amount: parsed.data.targetAmount,
    current_amount: parsed.data.currentAmount,
    deadline: parsed.data.deadline ?? null,
    notes: parsed.data.notes ?? null,
    is_completed: parsed.data.currentAmount >= parsed.data.targetAmount,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateGoal(id: string, input: GoalInput): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      target_amount: parsed.data.targetAmount,
      current_amount: parsed.data.currentAmount,
      deadline: parsed.data.deadline ?? null,
      notes: parsed.data.notes ?? null,
      is_completed: parsed.data.currentAmount >= parsed.data.targetAmount,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}
