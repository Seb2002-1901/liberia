import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { FHS_VERSION } from "@/lib/calculations/health/constants";
import type {
  AxisId,
  AxisResult,
  Band,
  Confidence,
  HealthScoreResult,
  SealedSnapshot,
} from "@/lib/calculations/health/types";

/**
 * Phase 3.2 — health_snapshots persistence service.
 *
 * Two read paths :
 *   - getMy*    — session-bound, RLS-enforced, cached per render
 *   - get*ByUserId / write* — admin-bound, system writes from the
 *     snapshot writer (Phase 3.2 Sprint 2 J7). Always include an
 *     explicit user_id filter — the admin client bypasses RLS but
 *     never cross-reads.
 *
 * Snapshots are APPEND-ONLY. writeSnapshot uses Postgres unique-key
 * conflict (user_id, week) as the idempotency guard. If two requests
 * race on the same week, the first wins and subsequent ones quietly
 * read the existing row.
 *
 * The (de)serialisation is intentionally split into PURE helpers
 * (snapshotPayloadFromResult / healthScoreResultFromRow) that are
 * tested in isolation from the network layer.
 */

const AXIS_ORDER: readonly AxisId[] = [
  "discipline",
  "resilience",
  "trajectoire",
  "couverture",
  "objectifs",
  "comportement",
];

/* -------------------------------------------------------------------------- */
/*  Row shapes — mirror the migration 20260606_health_snapshots.sql            */
/* -------------------------------------------------------------------------- */

export interface SnapshotRow {
  user_id: string;
  week: string;
  fhs_version: string;
  raw_score: number;
  smoothed_score: number;
  display_score: number;
  confidence: Confidence;
  band: Band;
  previous_score: number | null;
  previous_band: Band | null;
  axis_discipline: AxisResult;
  axis_resilience: AxisResult;
  axis_trajectoire: AxisResult;
  axis_couverture: AxisResult;
  axis_objectifs: AxisResult;
  axis_comportement: AxisResult;
  computed_at: string;
}

export interface WriteSnapshotInput {
  userId: string;
  week: string;
  result: HealthScoreResult;
}

/* -------------------------------------------------------------------------- */
/*  PURE helpers — exported for direct unit tests                              */
/* -------------------------------------------------------------------------- */

/**
 * Build the row payload that gets POSTed to Supabase. Pure projection
 * of HealthScoreResult onto the table shape — no I/O, no clock unless
 * already baked into result.computedAt.
 *
 * Why pure ? Because writeSnapshot is the only mutation API in the
 * FHS pipeline ; if its payload were ever wrong, every downstream
 * delta / momentum / coach reference would inherit the bug. Testing
 * this projection in isolation locks it.
 */
export function snapshotPayloadFromResult(
  userId: string,
  week: string,
  result: HealthScoreResult,
): Omit<SnapshotRow, "computed_at"> & { computed_at: string } {
  return {
    user_id: userId,
    week,
    fhs_version: result.fhsVersion,
    raw_score: result.raw,
    smoothed_score: result.smoothed,
    display_score: result.display,
    confidence: result.confidence,
    band: result.band,
    previous_score: result.previousScore,
    previous_band: result.previousBand,
    axis_discipline: result.axes.discipline,
    axis_resilience: result.axes.resilience,
    axis_trajectoire: result.axes.trajectoire,
    axis_couverture: result.axes.couverture,
    axis_objectifs: result.axes.objectifs,
    axis_comportement: result.axes.comportement,
    computed_at: result.computedAt,
  };
}

/**
 * Inverse of snapshotPayloadFromResult. Reconstructs a HealthScoreResult
 * from a DB row so any downstream consumer (delta engine, momentum,
 * coach context) sees the canonical domain type, not the row shape.
 *
 * Defensive on shape : every axis is required by the row's NOT NULL
 * jsonb constraint, but we still validate the AxisId on each blob so
 * a hand-edited row never escapes silently.
 */
export function healthScoreResultFromRow(row: SnapshotRow): HealthScoreResult {
  const axes: Record<AxisId, AxisResult> = {
    discipline: validateAxis(row.axis_discipline, "discipline"),
    resilience: validateAxis(row.axis_resilience, "resilience"),
    trajectoire: validateAxis(row.axis_trajectoire, "trajectoire"),
    couverture: validateAxis(row.axis_couverture, "couverture"),
    objectifs: validateAxis(row.axis_objectifs, "objectifs"),
    comportement: validateAxis(row.axis_comportement, "comportement"),
  };
  return {
    raw: row.raw_score,
    smoothed: row.smoothed_score,
    display: row.display_score,
    confidence: row.confidence,
    band: row.band,
    axes,
    previousScore: row.previous_score,
    previousBand: row.previous_band,
    fhsVersion: row.fhs_version,
    computedAt: row.computed_at,
  };
}

/**
 * Wrap a row into the SealedSnapshot shape — the canonical reading
 * format that surfaces both the week label (for delta/timeline
 * consumers) and the full HealthScoreResult (for renderers).
 */
export function sealedSnapshotFromRow(row: SnapshotRow): SealedSnapshot {
  return {
    week: row.week,
    result: healthScoreResultFromRow(row),
  };
}

function validateAxis(blob: unknown, expectedId: AxisId): AxisResult {
  if (!blob || typeof blob !== "object") {
    throw new Error(`health_snapshots : axis ${expectedId} jsonb is empty`);
  }
  const a = blob as Partial<AxisResult>;
  if (a.id !== expectedId) {
    throw new Error(
      `health_snapshots : axis column expected id "${expectedId}" but row contains "${String(a.id)}"`,
    );
  }
  if (typeof a.score !== "number" || typeof a.confidence !== "string") {
    throw new Error(
      `health_snapshots : axis ${expectedId} blob malformed (missing score/confidence)`,
    );
  }
  return blob as AxisResult;
}

/* -------------------------------------------------------------------------- */
/*  Session-side reads — RLS-enforced, cached per render                       */
/* -------------------------------------------------------------------------- */

export const getMyLatestSnapshot = cache(
  async (): Promise<SealedSnapshot | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("health_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(
        `[health] getMyLatestSnapshot failed: ${error.code ?? "?"} ${error.message}`,
      );
      return null;
    }
    return data ? sealedSnapshotFromRow(data as SnapshotRow) : null;
  },
);

export const listMyRecentSnapshots = cache(
  async (limit: number): Promise<SealedSnapshot[]> => {
    if (!isSupabaseConfigured() || limit <= 0) return [];
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("health_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("week", { ascending: false })
      .limit(limit);
    if (error) {
      console.error(
        `[health] listMyRecentSnapshots failed: ${error.code ?? "?"} ${error.message}`,
      );
      return [];
    }
    return ((data as SnapshotRow[] | null) ?? []).map(sealedSnapshotFromRow);
  },
);

/* -------------------------------------------------------------------------- */
/*  Admin-side reads — used by the snapshot writer (Sprint 2 J7)               */
/* -------------------------------------------------------------------------- */

export async function getLatestSnapshotByUserId(
  userId: string,
): Promise<SealedSnapshot | null> {
  if (!isAdminConfigured()) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("health_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(
      `[health] getLatestSnapshotByUserId failed user=${userId.slice(0, 8)}: ${error.code ?? "?"} ${error.message}`,
    );
    return null;
  }
  return data ? sealedSnapshotFromRow(data as SnapshotRow) : null;
}

export async function getSnapshotForWeek(
  userId: string,
  week: string,
): Promise<SealedSnapshot | null> {
  if (!isAdminConfigured()) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("health_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("week", week)
    .maybeSingle();
  if (error) {
    console.error(
      `[health] getSnapshotForWeek failed user=${userId.slice(0, 8)} week=${week}: ${error.code ?? "?"} ${error.message}`,
    );
    return null;
  }
  return data ? sealedSnapshotFromRow(data as SnapshotRow) : null;
}

/**
 * List the last N snapshots ordered most-recent-first. Drives the
 * Momentum engine — even fewer than N is acceptable, the caller
 * trims to its own minimum.
 */
export async function listRecentSnapshotsByUserId(
  userId: string,
  limit: number,
): Promise<SealedSnapshot[]> {
  if (!isAdminConfigured() || limit <= 0) return [];
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("health_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("week", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(
      `[health] listRecentSnapshotsByUserId failed user=${userId.slice(0, 8)}: ${error.code ?? "?"} ${error.message}`,
    );
    return [];
  }
  return ((data as SnapshotRow[] | null) ?? []).map(sealedSnapshotFromRow);
}

/**
 * Count snapshots — drives the INSUFFICIENT_DATA short-circuit
 * (`previousSnapshotCount === 0` makes the first computation
 * provisional by definition).
 */
export async function countSnapshotsByUserId(userId: string): Promise<number> {
  if (!isAdminConfigured()) return 0;
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("health_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error(
      `[health] countSnapshotsByUserId failed user=${userId.slice(0, 8)}: ${error.code ?? "?"} ${error.message}`,
    );
    return 0;
  }
  return count ?? 0;
}

/* -------------------------------------------------------------------------- */
/*  Write — append-only, idempotent on (user_id, week)                         */
/* -------------------------------------------------------------------------- */

/**
 * Insert a sealed snapshot for (userId, week). Idempotent : if a row
 * already exists for that pair, the existing row is returned and the
 * caller's input is silently dropped — snapshots are IMMUTABLE.
 *
 * Returns the row that lives in the DB after the call (either the
 * one we just inserted or the pre-existing one). Returns null only
 * on misconfiguration or persistent error.
 */
export async function writeSnapshot(
  input: WriteSnapshotInput,
): Promise<SealedSnapshot | null> {
  if (!isAdminConfigured()) {
    console.error(
      "[health] writeSnapshot: admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing)",
    );
    return null;
  }
  // Refuse to write a snapshot with the wrong FHS version — protects
  // long-term continuity. A caller built against v1.0 cannot
  // accidentally land into a table that has moved to v2.0.
  if (input.result.fhsVersion !== FHS_VERSION) {
    console.error(
      `[health] writeSnapshot: refusing fhs_version mismatch (caller=${input.result.fhsVersion}, runtime=${FHS_VERSION})`,
    );
    return null;
  }

  const admin = getAdminClient();
  const payload = snapshotPayloadFromResult(
    input.userId,
    input.week,
    input.result,
  );

  const { data, error } = await admin
    .from("health_snapshots")
    .insert(payload)
    .select("*")
    .maybeSingle();

  // PG unique_violation (23505) = race or re-call. That's success —
  // someone else (or a previous call) already sealed this week.
  if (error && error.code === "23505") {
    return getSnapshotForWeek(input.userId, input.week);
  }
  if (error) {
    console.error(
      `[health] writeSnapshot failed user=${input.userId.slice(0, 8)} week=${input.week}: ${error.code ?? "?"} ${error.message} — ${error.details ?? ""} (hint: ${error.hint ?? "none"})`,
    );
    return null;
  }
  return data ? sealedSnapshotFromRow(data as SnapshotRow) : null;
}

/**
 * Re-export the canonical axis order so callers can iterate or
 * present axes consistently — same ordering everywhere in LIBERIA.
 */
export { AXIS_ORDER };
