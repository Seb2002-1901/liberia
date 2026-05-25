"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { goalSchema, type GoalInput } from "@/lib/validations/finance";
import { LAPSED_ACCOUNT_GOAL_LIMIT } from "@/lib/constants";

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

  // Soft paywall: trialing/active users have no cap. Lapsed accounts
  // (no sub, canceled, past_due, unpaid…) keep read access to their data
  // but can only maintain LAPSED_ACCOUNT_GOAL_LIMIT active goal — they
  // need to resubscribe via the portal to unlock more.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const isPremium = sub?.plan === "premium";
  if (!isPremium) {
    const { count } = await supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", false);
    if ((count ?? 0) >= LAPSED_ACCOUNT_GOAL_LIMIT) {
      return {
        ok: false,
        error: `Limite de ${LAPSED_ACCOUNT_GOAL_LIMIT} objectif actif atteinte. Démarre ton essai 14 jours (ou reprends ton abonnement) pour des objectifs illimités.`,
      };
    }
  }

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
