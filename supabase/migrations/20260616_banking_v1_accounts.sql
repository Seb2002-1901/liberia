-- Sprint V5 Banking V1 — extension : bank_accounts.
--
-- L'utilisateur peut avoir plusieurs comptes (UBS courant +
-- PostFinance épargne + Yuh + Revolut...). On les nomme et on
-- associe chaque CSV à un compte pour pouvoir filtrer la liste
-- des transactions et éviter de mélanger les imports.
--
-- V1 reste simple : un compte = un nom libre + une banque + une
-- devise + un montant courant optionnel saisi à la main.
-- Pas de balance live (pas encore d'agrégation API).

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                             -- "UBS Courant", "PostFinance Salaire", etc.
  bank_hint text,                                 -- "ubs", "postfinance", etc.
  currency text not null default 'CHF',
  -- Solde courant saisi à la main par l'utilisateur (optionnel).
  -- Utilisé pour le forecast cashflow et les KPIs patrimoine.
  current_balance numeric(14, 2),
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bank_accounts_user on public.bank_accounts(user_id, is_archived);

alter table public.bank_accounts enable row level security;

drop policy if exists "users own bank_accounts" on public.bank_accounts;
create policy "users own bank_accounts"
  on public.bank_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Hook updated_at via trigger existant si défini, sinon manuel côté
-- application. La table profiles utilise handle_updated_at — on
-- réutilise.
drop trigger if exists set_updated_at_bank_accounts on public.bank_accounts;
create trigger set_updated_at_bank_accounts
before update on public.bank_accounts
for each row execute function public.handle_updated_at();

-- Lien bank_imports → bank_accounts (optionnel : si null, l'import
-- n'est associé à aucun compte spécifique).
alter table public.bank_imports
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;

create index if not exists idx_bank_imports_account on public.bank_imports(bank_account_id);

-- Lien bank_transactions → bank_accounts pour filtrage / agrégation.
alter table public.bank_transactions
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;

create index if not exists idx_bank_tx_account on public.bank_transactions(bank_account_id);
