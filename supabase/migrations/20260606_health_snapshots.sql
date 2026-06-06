-- =====================================================
-- Migration : Phase 3.2 — Financial Health Score
-- =====================================================
--
-- Two append-only tables that turn the FHS from a transient calculation
-- into a temporal series. Both are read-only from the user session and
-- written exclusively through the service-role snapshot writer.
--
--   * health_snapshots — one row per (user, ISO week). Holds the
--     full axis breakdown so the delta engine can compare term-by-term
--     without re-reading the underlying finance data.
--   * health_score_deltas — materialised explanation of the move
--     between two consecutive snapshots, persisted at write-time so
--     the dashboard drawer renders instantly.
--
-- DESIGN NOTES baked-in from Phase 3.2 architectural review :
--
--   * confidence stores the 4-tier vocabulary including the new
--     INSUFFICIENT_DATA tier. INSUFFICIENT_DATA is not "low" — it is
--     "we will not interpret yet", and the UI/coach treat it as a
--     distinct mode (questions, not conclusions).
--   * previous_score / previous_band are denormalised on every
--     snapshot. They make band-promotion and record-detection a
--     trivial filter, no window functions, no joins. Phase 3.3
--     (Timeline) consumes them directly.
--   * One jsonb column per axis preserves the AxisResult shape so
--     adding a new axis later (v2.0) is an additive column, never a
--     reshuffle of an existing one.
--   * fhs_version is stored on every row. Calibration changes
--     increment the version ; old snapshots stay readable at their
--     original semantics.
--
-- HOW TO RUN
-- ----------
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Paste this file
-- 3. Run. Re-running is safe (every statement is idempotent).

-- =========================================================
-- 1. health_snapshots
-- =========================================================

create table if not exists public.health_snapshots (
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- ISO 8601 week label in the USER's local timezone, e.g. "2026-W23".
  -- We don't use a date because a snapshot belongs to a week, not a day,
  -- and storing as text lets us order chronologically with plain sort.
  week           text not null,
  fhs_version    text not null default '1.0.0',

  -- Three score views kept side-by-side so we never lose the path from
  -- raw input to displayed number :
  --   raw      = weighted sum before smoothing (audit)
  --   smoothed = post-EMA (60/40) — the canonical score
  --   display  = smoothed clamped + rounded — what the user sees
  raw_score      smallint not null check (raw_score between 0 and 100),
  smoothed_score smallint not null check (smoothed_score between 0 and 100),
  display_score  smallint not null check (display_score between 0 and 100),

  confidence     text not null
    check (confidence in ('HIGH','MEDIUM','LOW','INSUFFICIENT_DATA')),
  band           text not null
    check (band in ('rose','ambre','or','emeraude')),

  -- Timeline-ready denormalisation. Stored at write-time from the
  -- previous snapshot, NULL on the very first snapshot. Phase 3.3
  -- queries band transitions and score records with simple WHERE
  -- clauses against these two columns — no window functions.
  previous_score smallint
    check (previous_score is null or previous_score between 0 and 100),
  previous_band  text
    check (previous_band is null or previous_band in ('rose','ambre','or','emeraude')),

  -- One jsonb per axis, shape locked by lib/calculations/health/types.ts.
  -- Each blob holds { id, score, confidence, components: {...} }.
  -- Storing the full AxisResult lets the delta engine reconstruct the
  -- WHY of every variation without re-reading expenses, goals or
  -- budgets at the time the snapshot was taken.
  axis_discipline    jsonb not null,
  axis_resilience    jsonb not null,
  axis_trajectoire   jsonb not null,
  axis_couverture    jsonb not null,
  axis_objectifs     jsonb not null,
  axis_comportement  jsonb not null,

  computed_at    timestamptz not null default timezone('utc', now()),

  primary key (user_id, week)
);

-- Reading "latest snapshot for user" is the hot path (every dashboard
-- load runs it). Descending index makes it a single index scan.
create index if not exists idx_health_snapshots_user_week_desc
  on public.health_snapshots (user_id, week desc);

-- Used by Phase 3.3 timeline to find band promotions/demotions and
-- score records without scanning the whole table.
create index if not exists idx_health_snapshots_transitions
  on public.health_snapshots (user_id, week)
  where previous_band is not null and band <> previous_band;

alter table public.health_snapshots enable row level security;

drop policy if exists "health_snapshots_self_select" on public.health_snapshots;
create policy "health_snapshots_self_select" on public.health_snapshots
  for select using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies. Writes go through the service
-- role exclusively (lib/services/health-snapshots.ts). A user-mutable
-- score table would be vulnerable to clock-skew and manual overwrites,
-- which would break the 5-year continuity promise.

-- =========================================================
-- 2. health_score_deltas
-- =========================================================

create table if not exists public.health_score_deltas (
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_to     text not null,
  week_from   text not null,
  fhs_version text not null,

  -- Signed integer. = display_score(to) - display_score(from).
  -- Bounded by [-100, 100] in practice but we don't constrain to keep
  -- arithmetic flexible.
  net_delta   smallint not null,

  -- Ordered array of 1-5 contributors. Each entry is :
  --   { axis, deltaPoints, reasonKey, payload }
  -- Shape locked by lib/calculations/health/delta.ts. Stored at
  -- snapshot-write-time so drawer reads are 1 row, 0 compute.
  contributors jsonb not null,

  computed_at timestamptz not null default timezone('utc', now()),

  primary key (user_id, week_to),
  -- Cascading FKs ensure deltas can never reference a missing
  -- snapshot. Deleting a user cascades from snapshots → deltas
  -- through both paths.
  foreign key (user_id, week_to)
    references public.health_snapshots (user_id, week) on delete cascade,
  foreign key (user_id, week_from)
    references public.health_snapshots (user_id, week) on delete cascade
);

alter table public.health_score_deltas enable row level security;

drop policy if exists "health_score_deltas_self_select" on public.health_score_deltas;
create policy "health_score_deltas_self_select" on public.health_score_deltas
  for select using (auth.uid() = user_id);

-- Same write policy as snapshots — service role only.

-- =========================================================
-- 3. PostgREST schema reload
-- =========================================================

notify pgrst, 'reload schema';
