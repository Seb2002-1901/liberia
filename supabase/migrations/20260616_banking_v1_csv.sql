-- Sprint V5 — Banking V1 : import CSV manuel + transactions.
--
-- Architecture Niveau 1 (cf. BANK_AGGREGATION_AUDIT.md) : pas de
-- connexion bancaire live, juste import CSV depuis l'e-banking de
-- l'utilisateur. Permet à 100% des utilisateurs CH d'arrêter la
-- saisie manuelle dès le 1er mois.
--
-- 3 tables :
--  - bank_imports : ledger des fichiers importés (audit + redo / undo)
--  - bank_transactions : transactions parsées normalisées
--  - on RÉ-UTILISE expenses + incomes pour la reconciliation
--
-- Pas de table bank_accounts au niveau V1 — on associe directement
-- les transactions à un libellé bancaire textuel. La normalisation
-- en accounts viendra avec le Niveau 2 (provider tiers).

create table if not exists public.bank_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_hint text,                           -- "ubs", "postfinance", "neon", "yuh", "revolut", "raiffeisen", "bcv", "unknown"
  file_name text,
  file_size_bytes int,
  row_count int not null default 0,
  imported_count int not null default 0,    -- nb transactions effectivement insérées (post-dédup)
  skipped_duplicate_count int not null default 0,
  status text not null default 'completed', -- 'pending' | 'completed' | 'failed'
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bank_imports_user on public.bank_imports(user_id, created_at desc);

alter table public.bank_imports enable row level security;

drop policy if exists "users own bank_imports" on public.bank_imports;
create policy "users own bank_imports"
  on public.bank_imports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- bank_transactions = ligne CSV brute normalisée. NE remplace PAS
-- expenses/incomes : c'est une "couche brute" que l'utilisateur peut
-- réconcilier (= convertir en expense/income confirmé).
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid references public.bank_imports(id) on delete set null,
  -- hash de dédup : sha256(user_id || transaction_date || amount || label_normalized)
  -- empêche d'importer 2x la même ligne si le user reimporte le mois suivant.
  dedup_hash text not null,
  transaction_date date not null,
  -- montant signé : positif = entrée, négatif = sortie
  amount numeric(12, 2) not null,
  currency text not null default 'CHF',
  label text not null,                      -- libellé brut tel qu'il apparaît sur le relevé
  raw_text text,                            -- ligne CSV originale pour audit
  -- suggested_category : devinette du parser (food/transport/...) sur base
  -- du label. L'utilisateur peut confirmer ou corriger.
  suggested_category text,
  -- reconciliation : null = brut non-traité, 'ignored' = user a dit non,
  -- 'matched_expense' / 'matched_income' = lié à une ligne existante,
  -- 'created_expense' / 'created_income' = a généré une nouvelle ligne.
  reconciliation_status text,
  reconciled_expense_id uuid references public.expenses(id) on delete set null,
  reconciled_income_id uuid references public.incomes(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  reconciled_at timestamptz,
  unique (user_id, dedup_hash)
);

create index if not exists idx_bank_tx_user_date on public.bank_transactions(user_id, transaction_date desc);
create index if not exists idx_bank_tx_user_status on public.bank_transactions(user_id, reconciliation_status);
create index if not exists idx_bank_tx_import on public.bank_transactions(import_id);

alter table public.bank_transactions enable row level security;

drop policy if exists "users own bank_transactions" on public.bank_transactions;
create policy "users own bank_transactions"
  on public.bank_transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ajout d'un champ source sur expenses et incomes pour tracer l'origine.
-- 'manual' (saisie utilisateur), 'coach' (créé via Iris tool),
-- 'csv_import' (réconciliation d'une bank_transaction).
alter table public.expenses
  add column if not exists source text not null default 'manual';
alter table public.incomes
  add column if not exists source text not null default 'manual';
