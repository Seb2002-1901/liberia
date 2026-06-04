import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import type {
  MemoryEntryKind,
  MemoryEntrySource,
  UserMemoryEntry,
} from "@/types/database";

/**
 * Phase 2 — premium memory. These services power the typed long-term
 * memory the coach builds from conversations. See
 * supabase/migrations/20240604_user_memory_entries.sql for the table
 * shape and why it lives next to `user_memory` rather than inside it.
 *
 * Two read paths exist:
 *   - listMyMemoryEntries() — for the settings UI; returns ALL non-
 *     archived entries owned by the current user, sorted for human
 *     review (kind > importance > recency).
 *   - selectEntriesForPrompt(userId, ...) — for the chat route;
 *     returns the top N entries ranked for LLM injection (importance
 *     first so vital goals always make the cut, then recency).
 *
 * Writes are admin-only (the chat-route extractor inserts via service
 * role bypassing RLS). User-side updates from the settings page use
 * archiveMyMemoryEntry / clearMyMemoryEntries which run through the
 * session client so RLS enforces ownership.
 */

/** Cap on entries injected into the system prompt per call. */
export const MEMORY_PROMPT_LIMIT = 12;

/** Max char length of the assembled memory block in the prompt. */
export const MEMORY_PROMPT_MAX_CHARS = 2000;

export const getCoachMemoryEnabled = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;
  const { data } = await supabase
    .from("profiles")
    .select("coach_memory_enabled")
    .eq("id", user.id)
    .maybeSingle();
  return data?.coach_memory_enabled ?? true;
});

/** Settings UI listing — ALL non-archived entries for the current user. */
export const listMyMemoryEntries = cache(
  async (): Promise<UserMemoryEntry[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("user_memory_entries")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("kind", { ascending: true })
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false });
    return (data as UserMemoryEntry[] | null) ?? [];
  },
);

/**
 * Top-N selection for the chat prompt. Caller passes userId because
 * this runs server-side from the chat route where we already have the
 * authenticated user. Uses the admin client to avoid double-fetching
 * the user; ownership is enforced explicitly by the WHERE clause.
 *
 * Ranking:
 *   1. importance DESC — vital goals always make the cut
 *   2. last_referenced_at DESC NULLS LAST — fresh > stale
 * Filters out: archived, expired (expires_at < now).
 */
export async function selectEntriesForPrompt(
  userId: string,
  limit: number = MEMORY_PROMPT_LIMIT,
): Promise<UserMemoryEntry[]> {
  if (!isAdminConfigured()) {
    console.error(
      "[memory] selectEntriesForPrompt: admin client not configured",
    );
    return [];
  }
  const admin = getAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("user_memory_entries")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("importance", { ascending: false })
    .order("last_referenced_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error(
      `[memory] selectEntriesForPrompt failed: ${error.code ?? "?"} ${error.message} — ${error.details ?? ""} (hint: ${error.hint ?? "none"})`,
    );
    return [];
  }
  const list = (data as UserMemoryEntry[] | null) ?? [];
  console.log(
    `[memory] selectEntriesForPrompt user=${userId.slice(0, 8)} returned ${list.length} entries (limit=${limit})`,
  );
  return list;
}

/**
 * Mark the given entries as "just referenced" so the recency ranking
 * keeps the actively-used ones near the top of future selections.
 * Fire-and-forget; failure must not block the chat response.
 */
export async function touchMemoryEntries(
  userId: string,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0 || !isAdminConfigured()) return;
  const admin = getAdminClient();
  await admin
    .from("user_memory_entries")
    .update({ last_referenced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids as string[]);
}

export interface UpsertMemoryEntryInput {
  userId: string;
  kind: MemoryEntryKind;
  key: string;
  summary: string;
  detail?: string | null;
  importance: number;
  confidence: number;
  source: MemoryEntrySource;
  conversationId?: string | null;
  expiresAt?: string | null;
}

/**
 * Upsert one entry from the coach extractor. (user_id, kind, key) is
 * unique, so calling this with the same key twice updates rather than
 * duplicates — the extractor produces stable slugs precisely for this.
 *
 * Bounds enforced in code AND at the DB layer (CHECK constraints), so
 * a misbehaving extractor cannot blow up the row size.
 */
export async function upsertMemoryEntry(
  input: UpsertMemoryEntryInput,
): Promise<UserMemoryEntry | null> {
  if (!isAdminConfigured()) {
    // Loud failure rather than silent null — the chat route relies on
    // this path to land entries, so an unconfigured admin client is a
    // misconfiguration that ops needs to see in the logs.
    console.error(
      "[memory] upsertMemoryEntry: admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)",
    );
    return null;
  }
  const admin = getAdminClient();
  const payload = {
    user_id: input.userId,
    kind: input.kind,
    key: input.key.slice(0, 80),
    summary: input.summary.slice(0, 280),
    detail: input.detail ? input.detail.slice(0, 1000) : null,
    importance: clamp(input.importance, 1, 5),
    confidence: clamp(input.confidence, 1, 5),
    source: input.source,
    conversation_id: input.conversationId ?? null,
    expires_at: input.expiresAt ?? null,
  };
  const { data, error } = await admin
    .from("user_memory_entries")
    .upsert(payload, { onConflict: "user_id,kind,key" })
    .select("*")
    .maybeSingle();
  if (error) {
    // Surface the real PostgREST error so ops can fix it (RLS issue,
    // CHECK violation, missing column after a partial migration).
    console.error(
      `[memory] upsertMemoryEntry failed kind=${input.kind} key=${input.key}: ${error.code ?? "?"} ${error.message} — ${error.details ?? ""} (hint: ${error.hint ?? "none"})`,
    );
    return null;
  }
  return (data as UserMemoryEntry | null) ?? null;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
