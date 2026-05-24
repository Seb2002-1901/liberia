"use server";

import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export async function confirmUnsubscribe(
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAdminConfigured()) {
    return { ok: false, error: "Service indisponible." };
  }
  if (!token || typeof token !== "string" || token.length < 8) {
    return { ok: false, error: "Lien invalide." };
  }
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_settings")
    .update({ email_weekly_summary: false })
    .eq("email_unsubscribe_token", token)
    .select("user_id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Lien invalide ou expiré." };
  }
  return { ok: true };
}
