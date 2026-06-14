"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";
import { requirePremiumAccess } from "@/lib/services/access";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Server actions backing the Settings → Mémoire IA page. They all run
 * with the session client so RLS enforces ownership — même si un client
 * malveillant forge un id d'entrée d'un autre user, le WHERE + RLS rend
 * l'opération no-op au lieu d'une fuite.
 *
 * Paywall (Sprint S2-BIS) : éditer la mémoire IA est une feature
 * premium. Un compte `lapsed` peut LIRE ses entrées (RLS, lecture
 * gratuite) mais ne peut plus archiver / vider / réactiver. C'est
 * cohérent avec /api/ai/chat — pas de coût LLM ici, mais c'est ce
 * pilier de "copilote IA personnalisé" qui justifie le tarif Premium.
 */

export async function archiveMemoryEntryAction(
  id: string,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const access = await requirePremiumAccess(supabase, user.id);
  if (!access.ok) return { ok: false, error: tErr(access.reasonKey) };

  // Soft-delete: keep the row for audit / undo, just stamp archived_at.
  // The prompt selector filters on archived_at IS NULL, so archived
  // entries vanish from the coach's context immediately.
  const { error } = await supabase
    .from("user_memory_entries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/memory");
  return { ok: true };
}

export async function clearAllMemoryEntriesAction(): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const access = await requirePremiumAccess(supabase, user.id);
  if (!access.ok) return { ok: false, error: tErr(access.reasonKey) };

  // Hard delete is intentional here — "tout effacer" is the user's
  // explicit nuclear option from the settings page. The soft-delete
  // path exists per-entry via archiveMemoryEntryAction.
  const { error } = await supabase
    .from("user_memory_entries")
    .delete()
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/memory");
  return { ok: true };
}

export async function setCoachMemoryEnabledAction(
  enabled: boolean,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  // Toggle "couper la mémoire" est libre (privacy) — pas de gate.
  // Sinon on enferme un user lapsed dans une mémoire qu'il ne peut plus
  // désactiver, ce qui contredit le RGPD/LPD.

  const { error } = await supabase
    .from("profiles")
    .update({ coach_memory_enabled: enabled })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/memory");
  return { ok: true };
}
