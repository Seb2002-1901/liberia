"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

async function requireUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function setEmailWeeklySummary(
  enabled: boolean,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ email_weekly_summary: enabled })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setNotificationAlerts(
  enabled: boolean,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ notification_alerts: enabled })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * RGPD-friendly export. Builds a JSON snapshot of everything the user
 * can see in the app and returns the bytes for the client to download.
 * Uses the user-session client (RLS already scopes to self).
 */
export async function exportUserData(): Promise<
  ActionResult<{ filename: string; json: string }>
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  const [
    profile,
    settings,
    financialProfile,
    incomes,
    expenses,
    goals,
    plans,
    planSteps,
    conversations,
    messages,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("financial_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("incomes").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("goals").select("*").eq("user_id", user.id),
    supabase.from("financial_plans").select("*").eq("user_id", user.id),
    supabase.from("financial_plan_steps").select("*").eq("user_id", user.id),
    supabase.from("ai_conversations").select("*").eq("user_id", user.id),
    supabase.from("ai_messages").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile: profile.data ?? null,
    user_settings: settings.data ?? null,
    financial_profile: financialProfile.data ?? null,
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    goals: goals.data ?? [],
    financial_plans: plans.data ?? [],
    financial_plan_steps: planSteps.data ?? [],
    ai_conversations: conversations.data ?? [],
    ai_messages: messages.data ?? [],
    note: "Données utilisateur exportées par LIBERIA. Conforme au principe RGPD de portabilité (Art. 20).",
  };

  return {
    ok: true,
    data: {
      filename: `liberia-export-${new Date().toISOString().slice(0, 10)}.json`,
      json: JSON.stringify(payload, null, 2),
    },
  };
}

/**
 * Hard delete the user's auth account. Supabase cascades to all owned
 * tables via the FK ON DELETE CASCADE chain (profiles, subscriptions,
 * financial_profiles, incomes, expenses, goals, financial_plans,
 * financial_plan_steps, ai_conversations, ai_messages, user_settings).
 * Stripe customer + subscription are NOT auto-deleted on the Stripe
 * side — flag them with metadata so the team can reconcile / refund
 * if requested. Hard delete of the Stripe Customer is reserved for an
 * admin script (not exposed here).
 */
export async function deleteAccount(): Promise<ActionResult> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      error:
        "La suppression de compte sera disponible très bientôt. Contacte le support pour une demande immédiate.",
    };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Authentification requise." };

  const admin = getAdminClient();

  // Mark the subscription as locally-deleted so we keep an audit trail.
  await admin
    .from("subscriptions")
    .update({ plan: "free", status: "canceled", cancel_at_period_end: true })
    .eq("user_id", userId);

  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) return { ok: false, error: error.message };

  redirect("/?account_deleted=1");
}
