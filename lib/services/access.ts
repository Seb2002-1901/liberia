import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Premium" access = the user currently has an active subscription or
 * is inside their 14-day free trial. Every other state (none, past_due,
 * canceled, paused, unpaid, incomplete, incomplete_expired) is the
 * soft-paywall surface: data stays readable, but write actions that
 * incur real cost on our side (LLM calls, plan generation) refuse.
 *
 * Read-only surfaces (existing conversations, existing plans, dashboard)
 * are NOT gated by this — the user keeps full read access to their data.
 *
 * Returns `{ ok: true }` when the user has access, `{ ok: false, reason }`
 * with a copy-ready message otherwise.
 */
export async function requirePremiumAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status as string | null | undefined;
  if (status === "trialing" || status === "active") {
    return { ok: true };
  }

  // Distinguish "never started" from "lapsed" so the error copy is honest.
  if (!status) {
    return {
      ok: false,
      reason:
        "Cette fonction est réservée aux comptes Premium. Démarre ton essai 14 jours pour l'activer.",
    };
  }
  return {
    ok: false,
    reason:
      "Ton abonnement n'est plus actif. Reprends ton abonnement pour utiliser cette fonction — tes données restent accessibles.",
  };
}
