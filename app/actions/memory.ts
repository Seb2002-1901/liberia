"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  memoryUpdateSchema,
  type MemoryUpdateInput,
} from "@/lib/validations/memory";
import { getActionErrors } from "@/lib/i18n/action-errors";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateMemory(
  input: MemoryUpdateInput,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = memoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

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

export async function clearMyMemory(): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };
  const { error } = await supabase
    .from("user_memory")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
