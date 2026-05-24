import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export const listConversations = cache(
  async (): Promise<ConversationSummary[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);
    return (data ?? []) as ConversationSummary[];
  },
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getConversation(
  id: string,
): Promise<{ title: string; messages: CoachMessage[] } | null> {
  // Pre-validate to avoid a Postgres "invalid input syntax for type uuid"
  // round-trip when the URL segment is garbage.
  if (!UUID_RE.test(id)) return null;
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conv) return null;

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return {
    title: conv.title,
    messages: (messages ?? []) as CoachMessage[],
  };
}
