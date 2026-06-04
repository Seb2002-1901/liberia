"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Server actions backing the Settings → Mémoire IA page. They all run
 * with the session client so RLS enforces ownership — even if a
 * malicious client forges another user's entry id, the WHERE clause
 * + RLS policy filter makes the operation a no-op rather than a leak.
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

  const { error } = await supabase
    .from("profiles")
    .update({ coach_memory_enabled: enabled })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/memory");
  return { ok: true };
}
