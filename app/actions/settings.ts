"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { getActionErrors } from "@/lib/i18n/action-errors";

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
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };
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
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };
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
 * Allowlist of email-preference columns the user can flip from the UI.
 * Stays in code (vs. taking the column name from the client) so a
 * malicious SDK call can't toggle billing-critical flags.
 */
const EMAIL_PREF_KEYS = [
  "email_encouragement",
  "email_trial_reminders",
  "email_goal_milestones",
  "email_inactivity_followup",
] as const;
export type EmailPreferenceKey = (typeof EMAIL_PREF_KEYS)[number];

export async function setEmailPreference(
  key: EmailPreferenceKey,
  enabled: boolean,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!EMAIL_PREF_KEYS.includes(key)) {
    return { ok: false, error: tErr("prefUnknown") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ [key]: enabled })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setAnalyticsOptOut(
  optedOut: boolean,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ analytics_opt_out: optedOut })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function exportUserData(): Promise<
  ActionResult<{ filename: string; json: string }>
> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const [
    profile,
    settings,
    financialProfile,
    memory,
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
    supabase.from("user_memory").select("*").eq("user_id", user.id).maybeSingle(),
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
    user_memory: memory.data ?? null,
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    goals: goals.data ?? [],
    financial_plans: plans.data ?? [],
    financial_plan_steps: planSteps.data ?? [],
    ai_conversations: conversations.data ?? [],
    ai_messages: messages.data ?? [],
    note: tErr("exportNote"),
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
 * Sprint S3 — RGPD/LPD : suppression de compte.
 *
 * Garanties :
 *   1. Annule l'abonnement Stripe (si configuré + present) → coupe la
 *      facturation récurrente. Si Stripe est down, on continue : le
 *      vrai « kill switch » est en local + l'abonnement orphelin sera
 *      flushé au prochain webhook.
 *   2. Marque la subscription locale `canceled` + `cancel_at_period_end`
 *      AVANT la suppression du user — sinon le RPC webhook qui réagit
 *      au `customer.subscription.deleted` de Stripe pourrait rater le
 *      contexte (foreign key cascade).
 *   3. Sign-out de la session cookie AVANT `deleteUser` :
 *      sans ça, le cookie JWT reste valide jusqu'à expiration et le
 *      middleware suivant verrait un user fantôme. signOut() invalide
 *      les refresh tokens côté Supabase ET clear les cookies locaux.
 *   4. `admin.auth.admin.deleteUser` qui CASCADE les FK (voir schema
 *      `on delete cascade` sur profiles / subscriptions / financial_*
 *      / incomes / expenses / goals / user_settings / ai_conversations
 *      / ai_messages / user_memory / user_memory_entries /
 *      category_budgets / health_snapshots). Conformité LPD/RGPD :
 *      aucune donnée user n'est laissée en base.
 *   5. Redirect vers / avec un flag `?account_deleted=1` que la home
 *      peut consommer pour afficher un toast confirmation.
 *
 * IMPÉRATIF : ne JAMAIS exposer ce server action sans confirmation
 * typée côté client. UI : `DeleteAccountButton` demande
 * `confirm()` puis `prompt()` avec le mot-clé i18n exact — pas de
 * suppression en un clic.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isAdminConfigured()) {
    return { ok: false, error: tErr("accountDeletionUnavailable") };
  }
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const admin = getAdminClient();

  // Stripe cancel — best-effort. Une coupure Stripe ne doit pas
  // bloquer la suppression LPD (droit à l'effacement = obligation
  // légale, pas une fonctionnalité Stripe-dépendante).
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    isStripeConfigured() &&
    sub?.stripe_subscription_id &&
    typeof sub.stripe_subscription_id === "string"
  ) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      // Stripe outage / already-canceled subscription — proceed with the
      // local delete anyway.
    }
  }

  await admin
    .from("subscriptions")
    .update({ plan: "free", status: "canceled", cancel_at_period_end: true })
    .eq("user_id", userId);

  // CRITIQUE — signOut de la session cookie AVANT deleteUser. Sans
  // ça, le JWT cookie reste valide ~1h et le middleware verrait un
  // user supprimé encore "connecté". signOut() invalide refresh
  // tokens côté Supabase + clear cookies locaux côté Next.
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Cookie clear best-effort — la suppression auth ci-dessous
      // invalidera les sessions de toute façon.
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) return { ok: false, error: error.message };

  redirect("/?account_deleted=1");
}
