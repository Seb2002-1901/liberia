import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  DeltaContributor,
  DeltaExplanation,
} from "@/lib/calculations/health/types";

/**
 * Phase 3.2 — health_score_deltas persistence service.
 *
 * Deltas are materialised at snapshot-write time so the dashboard
 * drawer reads them in a single row with zero compute. Like snapshots,
 * they are APPEND-ONLY and idempotent on (user_id, week_to).
 *
 * Read path : session client (RLS-enforced cookie-bound) for in-app
 *             rendering, admin client when the snapshot writer needs
 *             to fetch the previous delta for context.
 * Write path : admin client only, called from the snapshot writer
 *             immediately after the snapshot insert succeeds.
 */

export interface DeltaRow {
  user_id: string;
  week_to: string;
  week_from: string;
  fhs_version: string;
  net_delta: number;
  contributors: DeltaContributor[];
  computed_at: string;
}

export interface WriteDeltaInput {
  userId: string;
  explanation: DeltaExplanation;
}

/* -------------------------------------------------------------------------- */
/*  PURE helpers                                                               */
/* -------------------------------------------------------------------------- */

export function deltaPayloadFromExplanation(
  userId: string,
  explanation: DeltaExplanation,
): Omit<DeltaRow, "computed_at"> {
  return {
    user_id: userId,
    week_to: explanation.toWeek,
    week_from: explanation.fromWeek,
    fhs_version: explanation.fhsVersion,
    net_delta: explanation.netDelta,
    contributors: explanation.contributors,
  };
}

export function deltaExplanationFromRow(row: DeltaRow): DeltaExplanation {
  return {
    netDelta: row.net_delta,
    contributors: row.contributors,
    fhsVersion: row.fhs_version,
    fromWeek: row.week_from,
    toWeek: row.week_to,
  };
}

/* -------------------------------------------------------------------------- */
/*  Session-side read                                                          */
/* -------------------------------------------------------------------------- */

export const getMyDeltaForWeek = cache(
  async (week: string): Promise<DeltaExplanation | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("health_score_deltas")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_to", week)
      .maybeSingle();
    if (error) {
      console.error(
        `[health] getMyDeltaForWeek failed week=${week}: ${error.code ?? "?"} ${error.message}`,
      );
      return null;
    }
    return data ? deltaExplanationFromRow(data as DeltaRow) : null;
  },
);

/**
 * Latest delta for the current user — usually used by the dashboard
 * drawer when it has the latest snapshot but doesn't know its week
 * label up-front.
 */
export const getMyLatestDelta = cache(
  async (): Promise<DeltaExplanation | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("health_score_deltas")
      .select("*")
      .eq("user_id", user.id)
      .order("week_to", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(
        `[health] getMyLatestDelta failed: ${error.code ?? "?"} ${error.message}`,
      );
      return null;
    }
    return data ? deltaExplanationFromRow(data as DeltaRow) : null;
  },
);

/* -------------------------------------------------------------------------- */
/*  Admin-side                                                                 */
/* -------------------------------------------------------------------------- */

export async function getDeltaByUserIdAndWeek(
  userId: string,
  weekTo: string,
): Promise<DeltaExplanation | null> {
  if (!isAdminConfigured()) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("health_score_deltas")
    .select("*")
    .eq("user_id", userId)
    .eq("week_to", weekTo)
    .maybeSingle();
  if (error) {
    console.error(
      `[health] getDeltaByUserIdAndWeek failed user=${userId.slice(0, 8)} week=${weekTo}: ${error.code ?? "?"} ${error.message}`,
    );
    return null;
  }
  return data ? deltaExplanationFromRow(data as DeltaRow) : null;
}

/**
 * Insert a delta. Idempotent on (user_id, week_to) thanks to the
 * primary key — re-calls quietly return the existing row.
 */
export async function writeDelta(
  input: WriteDeltaInput,
): Promise<DeltaExplanation | null> {
  if (!isAdminConfigured()) {
    console.error(
      "[health] writeDelta: admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)",
    );
    return null;
  }
  if (input.explanation.fhsVersion !== FHS_VERSION) {
    console.error(
      `[health] writeDelta: refusing fhs_version mismatch (caller=${input.explanation.fhsVersion}, runtime=${FHS_VERSION})`,
    );
    return null;
  }

  const admin = getAdminClient();
  const payload = deltaPayloadFromExplanation(input.userId, input.explanation);

  const { data, error } = await admin
    .from("health_score_deltas")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error && error.code === "23505") {
    return getDeltaByUserIdAndWeek(input.userId, input.explanation.toWeek);
  }
  if (error) {
    console.error(
      `[health] writeDelta failed user=${input.userId.slice(0, 8)} weekTo=${input.explanation.toWeek}: ${error.code ?? "?"} ${error.message} — ${error.details ?? ""} (hint: ${error.hint ?? "none"})`,
    );
    return null;
  }
  return data ? deltaExplanationFromRow(data as DeltaRow) : null;
}
