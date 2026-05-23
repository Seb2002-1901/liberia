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

-- Generic per-user-table policies
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'subscriptions',
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
