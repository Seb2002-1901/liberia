import "server-only";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { computeComportement } from "@/lib/calculations/health/axes/comportement";
import { computeCouverture } from "@/lib/calculations/health/axes/couverture";
import { computeDiscipline } from "@/lib/calculations/health/axes/discipline";
import { computeObjectifs } from "@/lib/calculations/health/axes/objectifs";
import { computeResilience } from "@/lib/calculations/health/axes/resilience";
import { computeTrajectoire } from "@/lib/calculations/health/axes/trajectoire";
import {
  buildAxisInputs,
  type AxisInputBundle,
  type ExtraSignals,
} from "@/lib/calculations/health/axis-inputs";
import {
  composeHealthScore,
  type ComposeInput,
} from "@/lib/calculations/health/score";
import { explainDelta } from "@/lib/calculations/health/delta";
import { computeMomentum } from "@/lib/calculations/health/momentum";
import { buildHealthRecommendation } from "@/lib/calculations/health/recommendation";
import { buildTimeline } from "@/lib/calculations/health/timeline";
import {
  latestSealableWeek,
  toUserTimezone,
} from "@/lib/calculations/health/utils";
import { MOMENTUM_RULES } from "@/lib/calculations/health/constants";
import {
  countSnapshotsByUserId,
  getLatestSnapshotByUserId,
  getSnapshotForWeek,
  listRecentSnapshotsByUserId,
  writeSnapshot,
} from "@/lib/services/health-snapshots";
import {
  getDeltaByUserIdAndWeek,
  listRecentDeltasByUserId,
  writeDelta,
} from "@/lib/services/health-deltas";
import type {
  AxisId,
  AxisResult,
  DrawerData,
  HealthScoreResult,
  SealedSnapshot,
} from "@/lib/calculations/health/types";
import type { FinanceData } from "@/lib/services/finance";

/**
 * Phase 3.2 — Snapshot Writer + Drawer Data orchestrator.
 *
 * Single async entry point used by the dashboard route AND the coach
 * context AND (later) the planning module. Pipeline :
 *
 *   1. Aggregate financeData + extras → 6 axis inputs (pure).
 *   2. Run the 6 axis calculators (pure).
 *   3. Fetch latest sealed snapshot + total snapshot count.
 *   4. Compose live score with EMA against previous.smoothed.
 *   5. Determine the latest sealable ISO week from user TZ.
 *   6. If sealable week is unsealed → write the live score as its
 *      snapshot (idempotent on PK conflict).
 *   7. If a NEW seal was written AND a prior snapshot existed → run
 *      explainDelta and persist via writeDelta.
 *   8. Fetch the 4 most recent sealed snapshots → computeMomentum.
 *   9. Fetch the persisted delta for the displayed week.
 *  10. Build the recommendation from the displayed score.
 *  11. Return { score, delta, momentum, recommendation }.
 *
 * Everything pure stays pure : composition, axes, delta, momentum,
 * recommendation. Only this file does I/O.
 *
 * Idempotence : the snapshot write is protected by the (user_id, week)
 * PK ; race-safe via PG 23505 detection in writeSnapshot. The delta
 * write is protected by (user_id, week_to) PK ; same pattern.
 *
 * Returns a stable DrawerData even when persistence is unavailable
 * (live score still computes, delta/momentum/recommendation are null
 * in that case). The dashboard never fails because the health table
 * is down.
 */

export type { ExtraSignals } from "@/lib/calculations/health/axis-inputs";

export interface GetDrawerDataInput {
  userId: string;
  financeData: FinanceData;
  extras: ExtraSignals;
  /**
   * User's IANA timezone (e.g. "Europe/Zurich"). Determines when
   * Sunday 23:00 local has elapsed for sealing. Defaults to
   * Europe/Zurich for the Swiss user base.
   */
  timezone?: string;
  /** Injectable wall-clock for tests. Defaults to new Date(). */
  now?: Date;
}

const DEFAULT_TIMEZONE = "Europe/Zurich";

export async function getOrSealDrawerData(
  input: GetDrawerDataInput,
): Promise<DrawerData> {
  const {
    userId,
    financeData,
    extras,
    timezone = DEFAULT_TIMEZONE,
    now = new Date(),
  } = input;

  // --- Step 1 & 2 : axis inputs + 6 calculators (pure) ---
  const bundle = buildAxisInputs({ financeData, extras });
  const axes = runAxes(bundle);

  // --- Step 3 : previous snapshot + count (admin reads) ---
  const previous = isAdminConfigured()
    ? await getLatestSnapshotByUserId(userId)
    : null;
  const previousCount = isAdminConfigured()
    ? await countSnapshotsByUserId(userId)
    : 0;

  // --- Step 4 : compose the live score ---
  const liveCompose: ComposeInput = {
    axes,
    previousSmoothed: previous?.result.smoothed ?? null,
    previousDisplay: previous?.result.display ?? null,
    previousBand: previous?.result.band ?? null,
    previousSnapshotCount: previousCount,
    signals: bundle.signals,
    now,
  };
  const liveScore = composeHealthScore(liveCompose);

  // --- Step 5 : sealable week from user TZ ---
  const localNow = toUserTimezone(now, timezone);
  const sealableWeek = latestSealableWeek(localNow);

  // --- Step 6 & 7 : seal if needed + write delta ---
  let sealed: SealedSnapshot | null = null;
  let newSealWritten = false;
  if (isAdminConfigured()) {
    sealed = await getSnapshotForWeek(userId, sealableWeek);
    if (!sealed) {
      sealed = await writeSnapshot({
        userId,
        week: sealableWeek,
        result: liveScore,
      });
      // If writeSnapshot succeeded AND it wasn't a 23505 (already-existed)
      // path, we just sealed a NEW week. We can detect this by comparing
      // computedAt with the live score's : writeSnapshot returns the row
      // it inserted on a fresh write, vs the pre-existing row on conflict.
      // Easier heuristic : if previous exists and previous.week < sealed.week,
      // we have a new seal worth writing a delta for.
      if (sealed && previous && previous.week < sealed.week) {
        newSealWritten = true;
      } else if (sealed && !previous) {
        // First-ever snapshot — no delta to write.
        newSealWritten = false;
      }
    }
  }

  if (newSealWritten && previous && sealed) {
    const explanation = explainDelta({
      current: sealed.result,
      previous: previous.result,
      fromWeek: previous.week,
      toWeek: sealed.week,
    });
    await writeDelta({ userId, explanation });
  }

  // --- Step 8 : recent snapshots window. Sized to cover BOTH momentum
  //   (needs 4) AND timeline (Phase 3.3 — caps at 10 events but the
  //   underlying window benefits from a few extra so consecutive
  //   inactive weeks don't starve the engine).
  const TIMELINE_WINDOW = 12;
  const recent = isAdminConfigured()
    ? await listRecentSnapshotsByUserId(userId, TIMELINE_WINDOW)
    : [];
  const momentumSlice = recent.slice(0, MOMENTUM_RULES.WINDOW_SIZE);
  const momentum = computeMomentum(momentumSlice.map((s) => s.result));

  // --- Step 9 : the persisted delta for the displayed week ---
  // We always look at the latest sealed week's delta (the one row that
  // anchors "Pourquoi mon score a changé ?"). If newSealWritten is true,
  // we just wrote it — it's now readable.
  let delta = null;
  if (sealed && isAdminConfigured()) {
    delta = await getDeltaByUserIdAndWeek(userId, sealed.week);
  }

  // --- Step 9.5 : load all deltas anchoring the timeline window in a
  //   single round-trip and feed buildTimeline.
  let timeline = null;
  if (isAdminConfigured() && recent.length > 0) {
    const deltas = await listRecentDeltasByUserId(userId, TIMELINE_WINDOW);
    timeline = buildTimeline({ snapshots: recent, deltas });
  }

  // --- Step 10 : recommendation off the displayed score ---
  const displayed: HealthScoreResult = sealed?.result ?? liveScore;
  const recommendation = buildHealthRecommendation({ score: displayed });

  // --- Step 11 : assemble DrawerData ---
  return {
    score: displayed,
    delta,
    momentum,
    recommendation,
    timeline,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function runAxes(bundle: AxisInputBundle): Record<AxisId, AxisResult> {
  return {
    discipline: computeDiscipline(bundle.discipline),
    resilience: computeResilience(bundle.resilience),
    trajectoire: computeTrajectoire(bundle.trajectoire),
    couverture: computeCouverture(bundle.couverture),
    objectifs: computeObjectifs(bundle.objectifs),
    comportement: computeComportement(bundle.comportement),
  };
}

/* -------------------------------------------------------------------------- */
/*  Extras gatherer — pulls coach msg / memory / account age counts            */
/* -------------------------------------------------------------------------- */

/**
 * Fetch the extras the writer needs from the DB. Returns sane defaults
 * when the admin client is unconfigured so the dashboard renders even
 * in degraded modes.
 *
 * Pulled out of the writer so the dashboard route can call it once and
 * share the result with the coach context (same numbers everywhere).
 */
export async function gatherExtraSignals(input: {
  userId: string;
  financeData: FinanceData;
  /** Account creation time (auth.users.created_at or profiles.created_at). */
  accountCreatedAt: string | null;
  now?: Date;
}): Promise<ExtraSignals> {
  const { userId, financeData, accountCreatedAt, now = new Date() } = input;

  const txCount30d = countRecentTransactions(financeData, now);
  const accountAgeDays = computeAccountAgeDays(accountCreatedAt, now);

  if (!isAdminConfigured()) {
    return {
      txCount30d,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays,
      history3mIncomeAvg: null,
      incomeHistoryMonths: 0,
      savingsRatesByMonth: [],
    };
  }

  const admin = getAdminClient();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [coachMsgResult, memoryResult] = await Promise.all([
    admin
      .from("ai_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", thirtyDaysAgo),
    admin
      .from("user_memory_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo),
  ]);

  return {
    txCount30d,
    coachMsg30d: coachMsgResult.count ?? 0,
    memoryEntries30d: memoryResult.count ?? 0,
    accountAgeDays,
    history3mIncomeAvg: null,
    incomeHistoryMonths: 0,
    savingsRatesByMonth: [],
  };
}

/**
 * Compute days since the account was created, with a 0 floor when
 * the input is null or in the future (clock-skew defence).
 *
 * Exported PURE for direct testing.
 */
export function computeAccountAgeDays(
  accountCreatedAt: string | null,
  now: Date,
): number {
  if (!accountCreatedAt) return 0;
  const diff = now.getTime() - new Date(accountCreatedAt).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/**
 * Count one-time expenses logged in the last 30 days, dedup by
 * (label, amount) within a 1-hour window so a stuck retry doesn't
 * inflate the engagement signal.
 *
 * Exported PURE for direct testing.
 */
export function countRecentTransactions(
  financeData: FinanceData,
  now: Date,
): number {
  const cutoff = now.getTime() - 30 * 86_400_000;
  const recent = financeData.expenses.filter(
    (e) => e.frequency === "one_time" && Date.parse(e.created_at) >= cutoff,
  );
  const seen = new Set<string>();
  let count = 0;
  for (const e of recent) {
    if (e.amount < 1) continue; // anti-gaming : ≥ 1 CHF/unit minimum
    // 1-hour deduplication bucket
    const hourBucket = Math.floor(Date.parse(e.created_at) / 3_600_000);
    const key = `${e.label}|${e.amount}|${hourBucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count++;
  }
  return count;
}
