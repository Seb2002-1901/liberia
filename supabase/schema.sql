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
  locale text not null default 'fr-FR',
  currency text not null default 'EUR',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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
  add column if not exists last_event_at timestamptz;

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
  p_event_at timestamptz
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
    last_event_at
  )
  values (
    p_user_id,
    p_customer_id,
    p_subscription_id,
    p_status,
    p_plan,
    p_current_period_end,
    p_cancel_at_period_end,
    p_event_at
  )
  on conflict (user_id) do update
  set
    stripe_customer_id     = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status                 = excluded.status,
    plan                   = excluded.plan,
    current_period_end     = excluded.current_period_end,
    cancel_at_period_end   = excluded.cancel_at_period_end,
    last_event_at          = excluded.last_event_at
  where public.subscriptions.last_event_at is null
     or public.subscriptions.last_event_at < excluded.last_event_at;
end;
$$;

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
-- Row-Level Security
-- =====================================================
alter table public.profiles            enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.financial_profiles  enable row level security;
alter table public.incomes             enable row level security;
alter table public.expenses            enable row level security;
alter table public.goals               enable row level security;
alter table public.user_settings       enable row level security;

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
