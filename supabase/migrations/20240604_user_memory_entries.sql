-- =====================================================
-- Migration : Phase 2 — mémoire IA premium typée
-- =====================================================
--
-- Le coach apprend désormais des conversations et stocke des
-- "souvenirs" structurés (objectifs, préférences, événements,
-- blocages). Ces souvenirs sont injectés en début de chaque
-- conversation pour personnaliser les réponses.
--
-- Pourquoi une nouvelle table à côté de user_memory ?
--   - user_memory   = configuration de personnalité STABLE éditée
--                     manuellement par l'utilisateur (tone, traits,
--                     déclencheurs). 1 ligne par user.
--   - user_memory_entries = faits DYNAMIQUES extraits des conversations,
--                     time-decayed, individuellement archivables.
--                     N lignes par user.
--
-- Les deux jouent ensemble : user_memory donne le STYLE du coach,
-- user_memory_entries donne la MÉMOIRE des faits.
--
-- HOW TO RUN
-- ----------
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Paste this file
-- 3. Run. Re-running is safe (every statement is idempotent).

-- 1. Table user_memory_entries
create table if not exists public.user_memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- kind: 4 catégories distinctes, jamais "autre" pour rester lisible
  kind text not null check (kind in ('goal','preference','event','blocker')),
  -- key: slug stable (snake_case) permettant l'upsert idempotent quand
  -- le même fait revient sous une formulation légèrement différente.
  -- Exemple: 'buy_house', 'preference_simple_explanations'.
  key text not null,
  -- summary: phrase courte que le coach verra dans son contexte
  summary text not null,
  -- detail: contexte additionnel optionnel (citation, date, montant)
  detail text,
  -- importance: 1 trivial, 5 vital — utilisé pour ranker à l'injection
  importance smallint not null default 3 check (importance between 1 and 5),
  -- confidence: 1 incertain, 5 confirmé — extracteur attribue 3 par défaut
  confidence smallint not null default 3 check (confidence between 1 and 5),
  -- source: trace l'origine pour debug + future logique de purge
  source text not null default 'coach' check (source in ('user','coach','onboarding','inferred')),
  -- conversation_id: trace la conversation source (NULL si user-saisi)
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  -- expires_at: NULL = evergreen. Sinon purge automatique post-date.
  expires_at timestamptz,
  -- last_referenced_at: touché à chaque injection au prompt (pour
  -- garder les faits actifs en haut du ranking et purger les morts).
  last_referenced_at timestamptz,
  -- archived_at: soft-delete par l'utilisateur ; reste en base pour
  -- audit mais n'est plus jamais injecté.
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Unicité fonctionnelle : (user, kind, key) — permet l'upsert depuis
  -- l'extracteur sans dupliquer la même observation à chaque turn.
  unique (user_id, kind, key)
);

-- 2. Cap des champs texte (NOT VALID = nouvelles écritures seulement)
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('user_memory_entries', 'summary', 'user_memory_entries_summary_length',  280),
      ('user_memory_entries', 'detail',  'user_memory_entries_detail_length',  1000),
      ('user_memory_entries', 'key',     'user_memory_entries_key_length',       80)
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

-- 3. Indexes — un sur user_id pour les listings, un partiel sur les
--    actifs (non-archivés, non-expirés) pour les requêtes d'injection
--    qui doivent rester < 10 ms même sur 10k+ entries.
create index if not exists idx_user_memory_entries_user
  on public.user_memory_entries(user_id);
create index if not exists idx_user_memory_entries_active
  on public.user_memory_entries(user_id, importance desc, last_referenced_at desc nulls last)
  where archived_at is null;

-- 4. Trigger updated_at
drop trigger if exists set_updated_at_user_memory_entries on public.user_memory_entries;
create trigger set_updated_at_user_memory_entries
before update on public.user_memory_entries
for each row execute function public.handle_updated_at();

-- 5. RLS — self-only read/update/delete. Les INSERTs viennent du serveur
--    via service_role (extracteur post-réponse) ; on autorise tout de
--    même l'utilisateur à INSERT directement (cas d'un futur bouton
--    "ajouter manuellement"), avec la garde with check.
alter table public.user_memory_entries enable row level security;

drop policy if exists "user_memory_entries_self_select" on public.user_memory_entries;
create policy "user_memory_entries_self_select" on public.user_memory_entries
  for select using (auth.uid() = user_id);

drop policy if exists "user_memory_entries_self_insert" on public.user_memory_entries;
create policy "user_memory_entries_self_insert" on public.user_memory_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_memory_entries_self_update" on public.user_memory_entries;
create policy "user_memory_entries_self_update" on public.user_memory_entries
  for update using (auth.uid() = user_id);

drop policy if exists "user_memory_entries_self_delete" on public.user_memory_entries;
create policy "user_memory_entries_self_delete" on public.user_memory_entries
  for delete using (auth.uid() = user_id);

-- 6. Toggle utilisateur "désactiver la mémoire". true par défaut =
--    feature opt-out : le coach apprend, sauf si l'utilisateur refuse.
alter table public.profiles
  add column if not exists coach_memory_enabled boolean not null default true;

-- 7. PostgREST schema reload — sinon les clients JS gardent le vieux
--    cache de colonnes pendant quelques minutes et l'INSERT échoue.
notify pgrst, 'reload schema';
