"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  memoryUpdateSchema,
  type MemoryUpdateInput,
} from "@/lib/validations/memory";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Persist (upsert) the current user's coaching memory. Every field is
 * optional — only those present in `input` are written. RLS guarantees
 * the row belongs to the caller. DB CHECK constraints + zod schema cap
 * free-text lengths so a direct SDK call can't bloat the column.
 */
export async function updateMemory(
  input: MemoryUpdateInput,
): Promise<ActionResult> {
  const parsed = memoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  const v = parsed.data;
  const payload: Record<string, unknown> = { user_id: user.id };
  if (v.coachingTone !== undefined) payload.coaching_tone = v.coachingTone;
  if (v.recurringChallenges !== undefined)
    payload.recurring_challenges = v.recurringChallenges;
  if (v.spendingTriggers !== undefined)
    payload.spending_triggers = v.spendingTriggers;
  if (v.progressNotes !== undefined)
    payload.progress_notes = v.progressNotes;

  const { error } = await supabase
    .from("user_memory")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Erase the user's coaching memory row. The user keeps full control —
 * they can reset everything at any time. Idempotent.
 */
export async function clearMyMemory(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };
  const { error } = await supabase
    .from("user_memory")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
