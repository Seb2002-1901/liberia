-- =====================================================
-- LIBERIA — Database schema (Phase 1)
-- =====================================================
-- Run inside Supabase SQL editor. Idempotent: safe to re-run.

-- ----- Extensions -----
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----- Updated-at helper -----
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =====================================================
-- profiles
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  locale text not null default 'fr-CH',
  currency text not null default 'CHF',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- LIBERIA est orientée Suisse — la valeur par défaut passe à CHF / fr-CH.
-- Pour les bases déjà déployées on bascule UNIQUEMENT le DEFAULT (les
-- profils existants gardent leur valeur stockée).
alter table public.profiles alter column locale set default 'fr-CH';
alter table public.profiles alter column currency set default 'CHF';

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.handle_updated_at();

-- =====================================================
-- subscriptions
-- =====================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);

drop trigger if exists set_updated_at_subscriptions on public.subscriptions;
create trigger set_updated_at_subscriptions
before update on public.subscriptions
for each row execute function public.handle_updated_at();

-- =====================================================
-- financial_profiles
-- =====================================================
create table if not exists public.financial_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  situation text not null check (situation in ('struggling','tight','stable','comfortable')),
  monthly_income numeric(12,2) not null default 0,
  monthly_expenses numeric(12,2) not null default 0,
  current_savings numeric(12,2) not null default 0,
  monthly_debt numeric(12,2) not null default 0,
  has_emergency_fund boolean not null default false,
  main_goal text,
  perceived_stress integer not null default 3 check (perceived_stress between 1 and 5),
  stability_score integer not null default 0 check (stability_score between 0 and 100),
  stress_score integer not null default 0 check (stress_score between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

-- Idempotent column addition for databases provisioned before main_goal existed.
alter table public.financial_profiles add column if not exists main_goal text;

-- Behavior traits captured during onboarding — feeds future IA personalization.
-- Idempotent: safe to re-run.
alter table public.financial_profiles
  add column if not exists behavior_traits text[] not null default '{}';

create index if not exists idx_financial_profiles_user on public.financial_profiles(user_id);

drop trigger if exists set_updated_at_financial_profiles on public.financial_profiles;
create trigger set_updated_at_financial_profiles
before update on public.financial_profiles
for each row execute function public.handle_updated_at();

-- =====================================================
-- incomes
-- =====================================================
create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  category text not null,
  frequency text not null check (frequency in ('monthly','weekly','yearly','one_time')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_incomes_user on public.incomes(user_id);
create index if not exists idx_incomes_user_created on public.incomes(user_id, created_at desc);

drop trigger if exists set_updated_at_incomes on public.incomes;
create trigger set_updated_at_incomes
before update on public.incomes
for each row execute function public.handle_updated_at();

-- =====================================================
-- expenses
-- =====================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  category text not null,
  frequency text not null check (frequency in ('monthly','weekly','yearly','one_time')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_expenses_user_category on public.expenses(user_id, category);

drop trigger if exists set_updated_at_expenses on public.expenses;
create trigger set_updated_at_expenses
before update on public.expenses
for each row execute function public.handle_updated_at();

-- =====================================================
-- goals
-- =====================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  deadline date,
  notes text,
  is_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_goals_user on public.goals(user_id);

drop trigger if exists set_updated_at_goals on public.goals;
create trigger set_updated_at_goals
before update on public.goals
for each row execute function public.handle_updated_at();

-- is_completed is derived from the amounts. Computing it server-side
-- prevents a Free-plan user from "completing" a goal via the JS SDK
-- (which would otherwise free a slot under the active-goals limit).
create or replace function public.goals_set_is_completed()
returns trigger language plpgsql as $$
begin
  new.is_completed := new.current_amount >= new.target_amount;
  return new;
end;
$$;

drop trigger if exists goals_compute_is_completed on public.goals;
create trigger goals_compute_is_completed
before insert or update on public.goals
for each row execute function public.goals_set_is_completed();

-- =====================================================
-- user_settings
-- =====================================================
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  email_weekly_summary boolean not null default true,
  notification_alerts boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

drop trigger if exists set_updated_at_user_settings on public.user_settings;
create trigger set_updated_at_user_settings
before update on public.user_settings
for each row execute function public.handle_updated_at();

-- =====================================================
-- stripe_events (Phase 2) — webhook idempotence ledger
-- =====================================================
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default timezone('utc', now()),
  payload jsonb
);
create index if not exists idx_stripe_events_type on public.stripe_events(type);

-- Track the most recent Stripe event timestamp applied to each
-- subscription row so we can ignore out-of-order deliveries.
-- (Idempotent column add — safe for already-deployed Phase 2 databases.)
alter table public.subscriptions
  add column if not exists last_event_at timestamptz,
  add column if not exists trial_used boolean not null default false,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists price_id text;

-- Atomic conditional upsert for Stripe subscription state.
-- The naïve "SELECT last_event_at then UPDATE" pattern races when two
-- webhooks for the same user land in parallel — both readers see the
-- same last_event_at, both write, and the second writer wins even
-- when it carries an older event. This function does the comparison
-- inside a single SQL statement so Postgres serializes it for us.
create or replace function public.apply_subscription_event(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_plan text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_at timestamptz,
  p_price_id text default null,
  p_trial_started_at timestamptz default null,
  p_trial_ends_at timestamptz default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    plan,
    current_period_end,
    cancel_at_period_end,
    last_event_at,
    price_id,
    trial_started_at,
    trial_ends_at,
    -- A user is considered to have "used" their trial the moment a
    -- trialing or active subscription lands. We never reset this back
    -- to false (so cancellation + resubscribe doesn't grant a 2nd trial).
    trial_used
  )
  values (
    p_user_id,
    p_customer_id,
    p_subscription_id,
    p_status,
    p_plan,
    p_current_period_end,
    p_cancel_at_period_end,
    p_event_at,
    p_price_id,
    p_trial_started_at,
    p_trial_ends_at,
    case when p_status in ('trialing', 'active', 'past_due') then true else false end
  )
  on conflict (user_id) do update
  set
    stripe_customer_id     = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status                 = excluded.status,
    plan                   = excluded.plan,
    current_period_end     = excluded.current_period_end,
    cancel_at_period_end   = excluded.cancel_at_period_end,
    last_event_at          = excluded.last_event_at,
    price_id               = coalesce(excluded.price_id, public.subscriptions.price_id),
    trial_started_at       = coalesce(excluded.trial_started_at, public.subscriptions.trial_started_at),
    trial_ends_at          = coalesce(excluded.trial_ends_at, public.subscriptions.trial_ends_at),
    trial_used             = public.subscriptions.trial_used
                             or excluded.trial_used
  where public.subscriptions.last_event_at is null
     or public.subscriptions.last_event_at < excluded.last_event_at;
end;
$$;

-- CRITICAL: PostgREST exposes `public.*` functions via /rest/v1/rpc/{name}
-- and Postgres grants EXECUTE to PUBLIC by default. Combined with
-- SECURITY DEFINER, an authenticated user could otherwise call this
-- RPC directly from the browser and:
--   - set their own plan='premium' without paying
--   - poison another user's last_event_at to block future webhook updates
--   - cancel a competitor's subscription
-- Only the Stripe webhook (service_role) is allowed to invoke it.
revoke all on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, boolean, timestamptz,
  text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(
  uuid, text, text, text, text, timestamptz, boolean, timestamptz,
  text, timestamptz, timestamptz
) to service_role;

-- =====================================================
-- ai_conversations (Phase 2)
-- =====================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_conversations_user_updated
  on public.ai_conversations(user_id, updated_at desc)
  where archived_at is null;

drop trigger if exists set_updated_at_ai_conversations on public.ai_conversations;
create trigger set_updated_at_ai_conversations
before update on public.ai_conversations
for each row execute function public.handle_updated_at();

-- =====================================================
-- ai_messages (Phase 2)
-- =====================================================
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model text,
  tokens_in integer,
  tokens_out integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_messages_conversation
  on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_ai_messages_user on public.ai_messages(user_id);

-- Cap message length so a user cannot edit their own ai_messages rows
-- (the RLS update policy lets them) and inflate the context replayed
-- to Anthropic on the next chat call — bounded cost defense.
-- 16000 chars ≈ 4000 tokens; combined with MAX_CONVERSATION_TURNS=40
-- this caps the historical context at ~160k tokens (~0.50 CHF / call
-- in the worst case). Idempotent: NOT VALID skips back-check on
-- existing rows, the constraint still enforces all future writes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_messages'::regclass
      and conname = 'ai_messages_content_length'
  ) then
    alter table public.ai_messages
      add constraint ai_messages_content_length
      check (char_length(content) <= 16000) not valid;
  end if;
end$$;

-- Mirror Zod schema caps at the DB level so a user cannot bypass the
-- server-side validation via direct supabase-js writes and bloat the
-- finance context that buildFinanceContext() replays to Anthropic on
-- every chat / plan-generation call. NOT VALID = future writes only.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('incomes',           'label',  'incomes_label_length',           80),
      ('incomes',           'notes',  'incomes_notes_length',           280),
      ('expenses',          'label',  'expenses_label_length',          80),
      ('expenses',          'notes',  'expenses_notes_length',          280),
      ('goals',             'title',  'goals_title_length',             80),
      ('goals',             'notes',  'goals_notes_length',             280),
      ('ai_conversations',  'title',  'ai_conversations_title_length',  120)
    ) as t(table_name, column_name, constraint_name, max_len)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = ('public.' || spec.table_name)::regclass
        and conname = spec.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
        spec.table_name, spec.constraint_name, spec.column_name, spec.max_len
      );
    end if;
  end loop;
end$$;

-- =====================================================
-- RLS — Phase 2 additions
-- =====================================================
alter table public.stripe_events       enable row level security;
alter table public.ai_conversations    enable row level security;
alter table public.ai_messages         enable row level security;

-- stripe_events: no user-side access (only service_role via webhook)
drop policy if exists "stripe_events_no_user_select" on public.stripe_events;
drop policy if exists "stripe_events_no_user_insert" on public.stripe_events;
drop policy if exists "stripe_events_no_user_update" on public.stripe_events;
drop policy if exists "stripe_events_no_user_delete" on public.stripe_events;

-- ai_conversations: full self CRUD (titles, archive, delete)
drop policy if exists "ai_conversations_self_select" on public.ai_conversations;
create policy "ai_conversations_self_select" on public.ai_conversations
  for select using (auth.uid() = user_id);
drop policy if exists "ai_conversations_self_insert" on public.ai_conversations;
create policy "ai_conversations_self_insert" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
drop policy if exists "ai_conversations_self_update" on public.ai_conversations;
create policy "ai_conversations_self_update" on public.ai_conversations
  for update using (auth.uid() = user_id);
drop policy if exists "ai_conversations_self_delete" on public.ai_conversations;
create policy "ai_conversations_self_delete" on public.ai_conversations
  for delete using (auth.uid() = user_id);

-- ai_messages: users may read their own AND insert their own *user* turns.
-- Assistant turns must come from the server (service-role) to prevent a
-- user from forging fake assistant replies in their own conversation
-- history — that history is fed back to the model on the next turn, so
-- forged content would let the user poison their own LLM prompt and
-- bootstrap a prompt-injection. Update/delete stay user-controlled (the
-- user owns their conversation and can prune it).
drop policy if exists "ai_messages_self_select" on public.ai_messages;
create policy "ai_messages_self_select" on public.ai_messages
  for select using (auth.uid() = user_id);
drop policy if exists "ai_messages_self_insert_user" on public.ai_messages;
drop policy if exists "ai_messages_self_insert" on public.ai_messages;
create policy "ai_messages_self_insert_user" on public.ai_messages
  for insert with check (auth.uid() = user_id and role = 'user');
drop policy if exists "ai_messages_self_update" on public.ai_messages;
create policy "ai_messages_self_update" on public.ai_messages
  for update using (auth.uid() = user_id);
drop policy if exists "ai_messages_self_delete" on public.ai_messages;
create policy "ai_messages_self_delete" on public.ai_messages
  for delete using (auth.uid() = user_id);

-- =====================================================
-- financial_plans (Phase 3) — IA-generated 30/60/90 day plans
-- =====================================================
create table if not exists public.financial_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  horizon_days integer not null default 90 check (horizon_days in (30, 60, 90)),
  title text not null default 'Mon plan financier',
  summary text,
  model text,
  generation_input jsonb,        -- snapshot of finance context used (audit trail)
  is_active boolean not null default true,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_financial_plans_user_active
  on public.financial_plans(user_id, generated_at desc)
  where is_active = true;

drop trigger if exists set_updated_at_financial_plans on public.financial_plans;
create trigger set_updated_at_financial_plans
before update on public.financial_plans
for each row execute function public.handle_updated_at();

-- =====================================================
-- financial_plan_steps (Phase 3) — actionable items per plan
-- =====================================================
create table if not exists public.financial_plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.financial_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 13),
  focus text not null,
  title text not null,
  description text,
  expected_impact_eur numeric(12,2),
  category text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_financial_plan_steps_plan
  on public.financial_plan_steps(plan_id, week_number asc, position asc);
create index if not exists idx_financial_plan_steps_user
  on public.financial_plan_steps(user_id);

drop trigger if exists set_updated_at_plan_steps on public.financial_plan_steps;
create trigger set_updated_at_plan_steps
before update on public.financial_plan_steps
for each row execute function public.handle_updated_at();

-- RLS — plans + steps: self CRUD. Plan content is generated server-side
-- via Anthropic tool-use; the server still has to be able to write via
-- the user session for the initial insert, so we allow self INSERT.
alter table public.financial_plans       enable row level security;
alter table public.financial_plan_steps  enable row level security;

drop policy if exists "financial_plans_self_select" on public.financial_plans;
create policy "financial_plans_self_select" on public.financial_plans
  for select using (auth.uid() = user_id);
drop policy if exists "financial_plans_self_insert" on public.financial_plans;
create policy "financial_plans_self_insert" on public.financial_plans
  for insert with check (auth.uid() = user_id);
drop policy if exists "financial_plans_self_update" on public.financial_plans;
create policy "financial_plans_self_update" on public.financial_plans
  for update using (auth.uid() = user_id);
drop policy if exists "financial_plans_self_delete" on public.financial_plans;
create policy "financial_plans_self_delete" on public.financial_plans
  for delete using (auth.uid() = user_id);

drop policy if exists "financial_plan_steps_self_select" on public.financial_plan_steps;
create policy "financial_plan_steps_self_select" on public.financial_plan_steps
  for select using (auth.uid() = user_id);
drop policy if exists "financial_plan_steps_self_insert" on public.financial_plan_steps;
create policy "financial_plan_steps_self_insert" on public.financial_plan_steps
  for insert with check (auth.uid() = user_id);
drop policy if exists "financial_plan_steps_self_update" on public.financial_plan_steps;
create policy "financial_plan_steps_self_update" on public.financial_plan_steps
  for update using (auth.uid() = user_id);
drop policy if exists "financial_plan_steps_self_delete" on public.financial_plan_steps;
create policy "financial_plan_steps_self_delete" on public.financial_plan_steps
  for delete using (auth.uid() = user_id);

-- Phase 3 columns on user_settings for email preferences + unsubscribe token.
alter table public.user_settings
  add column if not exists email_unsubscribe_token text unique default gen_random_uuid()::text,
  add column if not exists last_weekly_sent_at timestamptz;

-- Phase 5 — granular email preferences. All default true (opt-out
-- model): user can disable specific categories from /settings while
-- still receiving billing-critical emails (those don't have a toggle).
-- Idempotent column add — safe to re-run.
alter table public.user_settings
  add column if not exists email_encouragement boolean not null default true,
  add column if not exists email_trial_reminders boolean not null default true,
  add column if not exists email_goal_milestones boolean not null default true,
  add column if not exists email_inactivity_followup boolean not null default true;

-- Phase 6 — privacy-friendly product analytics opt-out. Default false
-- (= opted in, but the tracker is itself no-op until a provider is
-- wired up, so this is purely a future-proof toggle).
alter table public.user_settings
  add column if not exists analytics_opt_out boolean not null default false;

-- =====================================================
-- user_memory (Phase 4) — IA personalization scaffolding
-- =====================================================
-- Lightweight 1-to-1 store for coaching preferences + structured notes
-- that will feed the LLM context once Anthropic is wired up. Until
-- then, the UI uses these fields to adapt dashboard tone and starter
-- recommendations deterministically. RLS strict self-only.
create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coaching_tone text check (coaching_tone in ('calm','direct','structured','gentle')),
  financial_personality text,
  recurring_challenges text[] not null default '{}',
  preferred_motivation_style text,
  spending_triggers text[] not null default '{}',
  progress_notes text,
  last_coach_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create index if not exists idx_user_memory_user on public.user_memory(user_id);

drop trigger if exists set_updated_at_user_memory on public.user_memory;
create trigger set_updated_at_user_memory
before update on public.user_memory
for each row execute function public.handle_updated_at();

-- Cap free-text fields at the DB level (mirror existing protections on
-- ai_messages / incomes / goals). NOT VALID = future writes only,
-- existing rows untouched, idempotent.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('user_memory', 'financial_personality',     'user_memory_personality_length',  280),
      ('user_memory', 'preferred_motivation_style','user_memory_motivation_length',   280),
      ('user_memory', 'progress_notes',            'user_memory_notes_length',       1000),
      ('user_memory', 'last_coach_summary',        'user_memory_summary_length',     4000)
    ) as t(table_name, column_name, constraint_name, max_len)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = ('public.' || spec.table_name)::regclass
        and conname = spec.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%I is null or char_length(%I) <= %s) not valid',
        spec.table_name, spec.constraint_name, spec.column_name, spec.column_name, spec.max_len
      );
    end if;
  end loop;
end$$;

-- =====================================================
-- Row-Level Security
-- =====================================================
alter table public.profiles            enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.financial_profiles  enable row level security;
alter table public.incomes             enable row level security;
alter table public.expenses            enable row level security;
alter table public.goals               enable row level security;
alter table public.user_settings       enable row level security;
alter table public.user_memory         enable row level security;

-- user_memory: self-only CRUD. The data is sensitive personalization
-- input — never shared, never cross-user-readable.
drop policy if exists "user_memory_self_select" on public.user_memory;
create policy "user_memory_self_select" on public.user_memory
  for select using (auth.uid() = user_id);
drop policy if exists "user_memory_self_insert" on public.user_memory;
create policy "user_memory_self_insert" on public.user_memory
  for insert with check (auth.uid() = user_id);
drop policy if exists "user_memory_self_update" on public.user_memory;
create policy "user_memory_self_update" on public.user_memory
  for update using (auth.uid() = user_id);
drop policy if exists "user_memory_self_delete" on public.user_memory;
create policy "user_memory_self_delete" on public.user_memory
  for delete using (auth.uid() = user_id);

-- profiles: each user reads/updates ONLY their own profile
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- subscriptions: read-only for users; all writes go through the
-- handle_new_user trigger (SECURITY DEFINER, runs at signup) and the
-- Stripe webhook (Phase 2, service-role client which bypasses RLS).
-- Letting users INSERT/UPDATE/DELETE here would allow self-promotion
-- to plan='premium' from the browser and bypass billing entirely.
drop policy if exists "subscriptions_self_select" on public.subscriptions;
create policy "subscriptions_self_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Explicitly drop any prior permissive write policies that earlier
-- versions of this schema may have created.
drop policy if exists "subscriptions_self_insert" on public.subscriptions;
drop policy if exists "subscriptions_self_update" on public.subscriptions;
drop policy if exists "subscriptions_self_delete" on public.subscriptions;

-- Generic per-user-table policies for tables the user fully owns
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'financial_profiles',
    'incomes',
    'expenses',
    'goals',
    'user_settings'
  ])
  loop
    execute format('drop policy if exists "%1$s_self_select" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_self_select" on public.%1$s for select using (auth.uid() = user_id);',
      t
    );

    execute format('drop policy if exists "%1$s_self_insert" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_self_insert" on public.%1$s for insert with check (auth.uid() = user_id);',
      t
    );

    execute format('drop policy if exists "%1$s_self_update" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_self_update" on public.%1$s for update using (auth.uid() = user_id);',
      t
    );

    execute format('drop policy if exists "%1$s_self_delete" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_self_delete" on public.%1$s for delete using (auth.uid() = user_id);',
      t
    );
  end loop;
end$$;

-- =====================================================
-- Auto-provision profile + subscription on signup
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Defense in depth: the auth.users INSERT trigger fires server-side and
-- doesn't need EXECUTE granted to anyone except the trigger machinery.
-- Strip the default PUBLIC grant so this SECURITY DEFINER function is
-- not directly callable via PostgREST.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Trigger functions for updated_at / goal completion run as the calling
-- user (no SECURITY DEFINER) so RLS still applies, but tightening the
-- default grant keeps the RPC surface minimal.
revoke all on function public.handle_updated_at() from public, anon, authenticated;
revoke all on function public.goals_set_is_completed() from public, anon, authenticated;
