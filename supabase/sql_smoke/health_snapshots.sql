-- =====================================================
-- Smoke tests : Phase 3.2 health_snapshots + health_score_deltas
-- =====================================================
--
-- WHAT THIS IS
-- ------------
-- Manual operational checks for the Phase 3.2 schema. NOT part of CI.
-- Paste blocks one by one in Supabase SQL Editor after running the
-- migration 20260606_health_snapshots.sql ; each block prints either
-- "OK" or raises the expected error.
--
-- HOW TO RUN
-- ----------
-- 1. Open Supabase Dashboard → SQL Editor → New query
-- 2. Pick a real auth.users.id from your DB and set it below :
--
--       :test_user_id  = '00000000-0000-0000-0000-000000000000'
--
-- 3. Run each named block separately. Look for "OK" in the result.
-- 4. The final block CLEANUP removes everything inserted by the tests.
--
-- WHAT THIS DOESN'T TEST
-- ----------------------
-- - RLS for the user-facing surfaces (requires a real auth session,
--   not the SQL editor's service-role context). Verify those manually
--   from the app with two different accounts.

-- ============================================================
-- Setup — pick a test user
-- ============================================================
-- Replace the value below with an existing auth.users.id from your
-- environment, then re-run the variable assignment before each block.
\set test_user '00000000-0000-0000-0000-000000000000'


-- ============================================================
-- TEST 1 — Insert a valid snapshot
-- Expected : 1 row inserted, returns the row
-- ============================================================
insert into public.health_snapshots (
  user_id, week, fhs_version,
  raw_score, smoothed_score, display_score,
  confidence, band,
  previous_score, previous_band,
  axis_discipline, axis_resilience, axis_trajectoire,
  axis_couverture, axis_objectifs, axis_comportement
) values (
  :'test_user'::uuid,
  '2099-W01',
  '1.0.0',
  72, 72, 72,
  'HIGH', 'or',
  null, null,
  '{"id":"discipline","score":72,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"resilience","score":70,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"trajectoire","score":80,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"couverture","score":85,"confidence":"HIGH","components":{},"details":{"filled_majors":["income","housing"]}}'::jsonb,
  '{"id":"objectifs","score":60,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"comportement","score":70,"confidence":"HIGH","components":{}}'::jsonb
) returning user_id, week, display_score, confidence, band;


-- ============================================================
-- TEST 2 — Invalid confidence value must be rejected
-- Expected : ERROR — check constraint "health_snapshots_confidence_check"
-- ============================================================
do $$
begin
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      current_setting('vars.test_user', true)::uuid,
      '2099-W02',
      '1.0.0',
      50, 50, 50,
      'EXCELLENT', 'or',                       -- <-- invalid
      '{"id":"discipline"}'::jsonb,
      '{"id":"resilience"}'::jsonb,
      '{"id":"trajectoire"}'::jsonb,
      '{"id":"couverture"}'::jsonb,
      '{"id":"objectifs"}'::jsonb,
      '{"id":"comportement"}'::jsonb
    );
    raise exception 'TEST 2 FAILED — invalid confidence was accepted';
  exception when check_violation then
    raise notice 'TEST 2 OK — invalid confidence rejected by CHECK';
  end;
end$$;


-- ============================================================
-- TEST 3 — Invalid band value must be rejected
-- Expected : ERROR — check constraint "health_snapshots_band_check"
-- ============================================================
do $$
begin
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid,
      '2099-W02',
      '1.0.0',
      50, 50, 50,
      'HIGH', 'platinum',                      -- <-- invalid
      '{"id":"discipline"}'::jsonb,
      '{"id":"resilience"}'::jsonb,
      '{"id":"trajectoire"}'::jsonb,
      '{"id":"couverture"}'::jsonb,
      '{"id":"objectifs"}'::jsonb,
      '{"id":"comportement"}'::jsonb
    );
    raise exception 'TEST 3 FAILED — invalid band was accepted';
  exception when check_violation then
    raise notice 'TEST 3 OK — invalid band rejected by CHECK';
  end;
end$$;


-- ============================================================
-- TEST 4 — Score range CHECKs (negative + > 100 rejected)
-- Expected : ERROR on both inserts
-- ============================================================
do $$
begin
  -- 4a : negative display_score
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid, '2099-W02', '1.0.0',
      50, 50, -10, 'HIGH', 'or',
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
    );
    raise exception 'TEST 4a FAILED — negative score was accepted';
  exception when check_violation then
    raise notice 'TEST 4a OK — negative score rejected';
  end;

  -- 4b : raw_score > 100
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid, '2099-W02', '1.0.0',
      150, 50, 50, 'HIGH', 'or',
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
    );
    raise exception 'TEST 4b FAILED — score > 100 was accepted';
  exception when check_violation then
    raise notice 'TEST 4b OK — score > 100 rejected';
  end;
end$$;


-- ============================================================
-- TEST 5 — Idempotence : duplicate (user_id, week) rejected
-- Expected : ERROR — duplicate key value violates unique constraint
-- ============================================================
do $$
begin
  begin
    -- Insert the same (user, week) as TEST 1 again.
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid, '2099-W01', '1.0.0',
      50, 50, 50, 'HIGH', 'ambre',
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
    );
    raise exception 'TEST 5 FAILED — duplicate (user_id, week) accepted';
  exception when unique_violation then
    raise notice 'TEST 5 OK — duplicate (user_id, week) rejected by PK';
  end;
end$$;


-- ============================================================
-- TEST 6 — previous_band CHECK (null allowed, invalid rejected)
-- Expected : 6a OK ; 6b ERROR
-- ============================================================
do $$
begin
  -- 6a : previous_band null is allowed (first snapshot)
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      previous_score, previous_band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid, '2099-W03', '1.0.0',
      50, 50, 50, 'HIGH', 'ambre',
      null, null,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
    );
    raise notice 'TEST 6a OK — null previous_band accepted';
    delete from public.health_snapshots
      where user_id = :'test_user'::uuid and week = '2099-W03';
  end;

  -- 6b : invalid previous_band rejected
  begin
    insert into public.health_snapshots (
      user_id, week, fhs_version,
      raw_score, smoothed_score, display_score,
      confidence, band,
      previous_score, previous_band,
      axis_discipline, axis_resilience, axis_trajectoire,
      axis_couverture, axis_objectifs, axis_comportement
    ) values (
      :'test_user'::uuid, '2099-W04', '1.0.0',
      50, 50, 50, 'HIGH', 'ambre',
      50, 'shiny',                              -- <-- invalid
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
    );
    raise exception 'TEST 6b FAILED — invalid previous_band accepted';
  exception when check_violation then
    raise notice 'TEST 6b OK — invalid previous_band rejected';
  end;
end$$;


-- ============================================================
-- TEST 7 — Delta : FK to a missing snapshot must be rejected
-- Expected : ERROR — foreign key violation on week_from
-- ============================================================
do $$
begin
  begin
    insert into public.health_score_deltas (
      user_id, week_to, week_from, fhs_version, net_delta, contributors
    ) values (
      :'test_user'::uuid,
      '2099-W01',            -- exists (from TEST 1)
      '1900-W01',            -- does NOT exist
      '1.0.0',
      0,
      '[]'::jsonb
    );
    raise exception 'TEST 7 FAILED — delta with missing FK accepted';
  exception when foreign_key_violation then
    raise notice 'TEST 7 OK — delta with missing FK rejected';
  end;
end$$;


-- ============================================================
-- TEST 8 — Delta : valid insert + cascade on snapshot delete
-- Expected : 8a OK ; 8b OK (cascade)
-- ============================================================
-- 8a : seed a second snapshot then a valid delta
insert into public.health_snapshots (
  user_id, week, fhs_version,
  raw_score, smoothed_score, display_score,
  confidence, band,
  previous_score, previous_band,
  axis_discipline, axis_resilience, axis_trajectoire,
  axis_couverture, axis_objectifs, axis_comportement
) values (
  :'test_user'::uuid, '2099-W02', '1.0.0',
  75, 73, 73, 'HIGH', 'or',
  72, 'or',
  '{"id":"discipline","score":73,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"resilience","score":75,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"trajectoire","score":82,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"couverture","score":85,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"objectifs","score":62,"confidence":"HIGH","components":{}}'::jsonb,
  '{"id":"comportement","score":72,"confidence":"HIGH","components":{}}'::jsonb
);

insert into public.health_score_deltas (
  user_id, week_to, week_from, fhs_version, net_delta, contributors
) values (
  :'test_user'::uuid, '2099-W02', '2099-W01', '1.0.0', 1,
  '[{"axis":"resilience","deltaPoints":1,"reasonKey":"resilience_runway_improved","payload":{}}]'::jsonb
);

-- Verify both rows exist
select 'TEST 8a OK — snapshot + delta inserted' as status,
       (select count(*) from public.health_score_deltas
        where user_id = :'test_user'::uuid and week_to = '2099-W02') as deltas;

-- 8b : delete the destination snapshot, expect cascade
delete from public.health_snapshots
  where user_id = :'test_user'::uuid and week = '2099-W02';

select 'TEST 8b OK — cascade removed the delta' as status
where not exists (
  select 1 from public.health_score_deltas
  where user_id = :'test_user'::uuid and week_to = '2099-W02'
);


-- ============================================================
-- TEST 9 — Transitions index is used for band-change queries
-- Expected : an EXPLAIN that mentions idx_health_snapshots_transitions
--            once you have a few snapshots with band changes
-- ============================================================
explain (analyze false, buffers false)
select user_id, week, band, previous_band
from public.health_snapshots
where user_id = :'test_user'::uuid
  and previous_band is not null
  and band <> previous_band;


-- ============================================================
-- CLEANUP — remove all rows created by these tests
-- ============================================================
delete from public.health_score_deltas
  where user_id = :'test_user'::uuid and week_to like '2099-%';
delete from public.health_snapshots
  where user_id = :'test_user'::uuid and week like '2099-%';

select 'CLEANUP DONE — all test rows removed' as status;
