-- =====================================================
-- Migration : add country to profiles + multi-region whitelists
-- =====================================================
--
-- Run once on production Supabase to land the per-user country /
-- currency / locale support introduced in commit dd31420.
--
-- HOW TO RUN
-- ----------
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Paste the entire content of this file
-- 3. Run. Re-running is safe (every statement is idempotent).
--
-- After this lands, the /profile locale form stops erroring with
-- "Could not find the 'country' column of 'profiles' in the schema
-- cache" — the NOTIFY at the bottom forces PostgREST to reload
-- without waiting for its periodic cache cycle.
--
-- This file is a strict subset of supabase/schema.sql so re-running
-- the full schema later is a no-op.

-- 1. Add the column with a CH default. NOT NULL is safe because the
--    default backfills every existing row in the same statement.
alter table public.profiles
  add column if not exists country text not null default 'CH';

-- 2. One-shot data fix: profiles created before the Swiss pivot kept
--    currency='EUR' as their persisted default. They have country='CH'
--    (the new default we just set), so we know the EUR was never an
--    explicit user choice — flip it to CHF. Idempotent: no row matches
--    after the first pass. A user who later picks France or another
--    EUR country via the profile form is untouched (country != 'CH').
update public.profiles
   set currency = 'CHF'
 where currency = 'EUR'
   and country = 'CH';

-- 3. Soft whitelists (NOT VALID) — future writes are checked, existing
--    rows are never rejected even if they hold a value outside the
--    list. The /profile form is the single user-facing entry point
--    and only offers the same 7 values.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_currency_chk'
  ) then
    alter table public.profiles
      add constraint profiles_currency_chk
      check (currency in ('CHF','EUR','USD','GBP')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_locale_chk'
  ) then
    alter table public.profiles
      add constraint profiles_locale_chk
      check (locale in ('fr-CH','fr-FR','en-US','en-GB','de-DE','it-IT')) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_country_chk'
  ) then
    alter table public.profiles
      add constraint profiles_country_chk
      check (country in ('CH','FR','BE','DE','IT','GB','US')) not valid;
  end if;
end$$;

-- 4. Tell PostgREST to drop its schema cache immediately. Without this
--    the JS client keeps hitting the stale cache for a few minutes and
--    returns "Could not find the 'country' column of 'profiles' in the
--    schema cache" on every UPDATE from updateProfileLocale().
notify pgrst, 'reload schema';
