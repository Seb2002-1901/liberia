"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  conversationIdSchema,
  conversationTitleSchema,
} from "@/lib/ai/safety";
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

export async function createConversation(): Promise<
  ActionResult<{ id: string }>
> {
  const tErr = await getActionErrors();
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach");
  return { ok: true, data: { id: data.id } };
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const idParsed = conversationIdSchema.safeParse({ id });
  if (!idParsed.success) return { ok: false, error: tErr("conversationInvalid") };

  const titleParsed = conversationTitleSchema.safeParse({ title });
  if (!titleParsed.success) {
    return { ok: false, error: tErr("titleInvalid") };
  }

  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: titleParsed.data.title })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach");
  return { ok: true };
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const idParsed = conversationIdSchema.safeParse({ id });
  if (!idParsed.success) return { ok: false, error: tErr("conversationInvalid") };

  const userId = await requireUserId();
  if (!userId) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach");
  return { ok: true };
}
