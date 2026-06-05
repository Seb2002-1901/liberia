-- =====================================================
-- Migration : Phase 3.1.2 — budgets par catégorie + ROUTES.analytics
-- =====================================================
--
-- Permet à l'utilisateur de fixer une limite mensuelle par catégorie
-- de dépense. La nouvelle page /expenses/analytics les édite, le
-- coach les lit pour signaler les dépassements ("Ton budget restau
-- est dépassé de 60 CHF ce mois.").
--
-- HOW TO RUN
-- ----------
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Paste this file
-- 3. Run. Re-running is safe (every statement is idempotent).

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Category id from lib/constants EXPENSE_CATEGORIES. We don't add a
  -- DB-side enum so that adding a category in code doesn't require a
  -- migration; validation happens client-side via the existing
  -- expenseCategoryIds zod enum.
  category text not null,
  monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  -- Currency follows the user's profile but stored explicitly so the
  -- budget is interpretable on its own (no implicit cross-row join).
  currency text not null default 'CHF',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- One budget per (user, category) — the page lets the user UPDATE
  -- the limit rather than create duplicates.
  unique (user_id, category)
);

create index if not exists idx_category_budgets_user
  on public.category_budgets(user_id);

drop trigger if exists set_updated_at_category_budgets on public.category_budgets;
create trigger set_updated_at_category_budgets
before update on public.category_budgets
for each row execute function public.handle_updated_at();

-- RLS — strict self-only. Service role bypasses RLS for analytics
-- reads from the coach context but UI uses the session client.
alter table public.category_budgets enable row level security;

drop policy if exists "category_budgets_self_select" on public.category_budgets;
create policy "category_budgets_self_select" on public.category_budgets
  for select using (auth.uid() = user_id);

drop policy if exists "category_budgets_self_insert" on public.category_budgets;
create policy "category_budgets_self_insert" on public.category_budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "category_budgets_self_update" on public.category_budgets;
create policy "category_budgets_self_update" on public.category_budgets
  for update using (auth.uid() = user_id);

drop policy if exists "category_budgets_self_delete" on public.category_budgets;
create policy "category_budgets_self_delete" on public.category_budgets
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
