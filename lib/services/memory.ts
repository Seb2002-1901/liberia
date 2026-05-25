import "server-only";
import { cache } from "react";
import {
  COACHING_TONES,
  RECURRING_CHALLENGES,
  SPENDING_TRIGGERS,
  type CoachingToneId,
} from "@/lib/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CoachingTone,
  FinancialProfile,
  UserMemory,
} from "@/types/database";

/**
 * Fetches the current user's memory row via the user-session client.
 * RLS guarantees self-only access. Returns null when no row exists yet
 * (lazy provisioning — created on first save).
 */
export const getMyUserMemory = cache(async (): Promise<UserMemory | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as UserMemory | null) ?? null;
});

/**
 * Derives a coaching tone even when the user hasn't explicitly picked
 * one. Uses behavior traits as the heuristic — keeps the dashboard
 * adaptive on day one.
 */
export function resolveCoachingTone(
  explicit: CoachingTone | null | undefined,
  behaviorTraits: readonly string[] = [],
): CoachingToneId {
  if (explicit) return explicit;
  const traits = new Set(behaviorTraits);
  if (traits.has("anxious") || traits.has("avoidant")) return "calm";
  if (traits.has("motivated")) return "direct";
  if (traits.has("organized") || traits.has("disciplined")) return "structured";
  if (traits.has("lost") || traits.has("rebuilding")) return "gentle";
  return "calm";
}

/**
 * Assembles a stable, compact, LLM-ready context block describing the
 * user. Pure function over already-fetched data — no side effects, no
 * external calls. Today it powers the deterministic insight surface;
 * when ANTHROPIC_API_KEY lands, the same string can be dropped into
 * the system prompt of the coach without any shape change.
 *
 * Excludes raw amounts when caller passes `compact: true` so the
 * context stays under the prompt-caching minimum without leaking
 * sensitive financial detail to a model that doesn't need it.
 */
export function buildUserMemoryContext(input: {
  fullName?: string | null;
  financialProfile: FinancialProfile | null;
  memory: UserMemory | null;
  compact?: boolean;
}): string {
  const { fullName, financialProfile, memory, compact = false } = input;

  const toneId = resolveCoachingTone(
    memory?.coaching_tone ?? null,
    financialProfile?.behavior_traits ?? [],
  );
  const tone = COACHING_TONES.find((t) => t.id === toneId);

  const traitLabels = (financialProfile?.behavior_traits ?? [])
    .slice(0, 6)
    .join(", ");

  const challenges = (memory?.recurring_challenges ?? [])
    .map((id) => RECURRING_CHALLENGES.find((c) => c.id === id)?.label ?? id)
    .join(", ");

  const triggers = (memory?.spending_triggers ?? [])
    .map((id) => SPENDING_TRIGGERS.find((c) => c.id === id)?.label ?? id)
    .join(", ");

  const lines: string[] = [];
  lines.push("# Mémoire utilisateur");
  if (fullName) lines.push(`Prénom : ${fullName.split(" ")[0]}`);
  if (financialProfile?.situation)
    lines.push(`Situation déclarée : ${financialProfile.situation}`);
  if (financialProfile?.main_goal)
    lines.push(`Objectif principal : ${financialProfile.main_goal}`);
  if (traitLabels) lines.push(`Profil comportemental : ${traitLabels}`);
  if (tone) lines.push(`Style de coaching attendu : ${tone.label}`);
  if (challenges) lines.push(`Difficultés récurrentes : ${challenges}`);
  if (triggers) lines.push(`Déclencheurs de dépense : ${triggers}`);
  if (memory?.preferred_motivation_style)
    lines.push(
      `Style de motivation préféré : ${memory.preferred_motivation_style}`,
    );
  if (memory?.financial_personality)
    lines.push(`Personnalité financière : ${memory.financial_personality}`);
  if (memory?.progress_notes)
    lines.push(`Notes personnelles : ${memory.progress_notes}`);
  if (memory?.last_coach_summary && !compact)
    lines.push(`Dernier résumé du coach : ${memory.last_coach_summary}`);

  return lines.join("\n");
}
