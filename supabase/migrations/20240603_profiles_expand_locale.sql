-- =====================================================
-- Migration : décorréler country / currency / locale
-- =====================================================
--
-- Suite du commit 20240602_profiles_country.sql. La V1 imposait un
-- couple country→language strict (Suisse forçait Français Suisse, etc).
-- La V1.1 sépare les trois champs : un utilisateur suisse peut
-- parfaitement payer en CHF et utiliser l'app en italien, allemand ou
-- anglais. Le formulaire de profil affiche désormais 3 sélecteurs
-- indépendants ; choisir un pays propose simplement des défauts pour
-- les deux autres.
--
-- HOW TO RUN
-- ----------
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Paste the entire content of this file
-- 3. Run. Re-running is safe (every statement is idempotent).
--
-- Cette migration est un strict sous-ensemble de supabase/schema.sql
-- (la même séquence DROP+ADD figure désormais dans le schéma de
-- référence). Aucune perte de données : on droppe les anciennes
-- CHECK constraints trop étroites puis on remet les versions élargies
-- en NOT VALID, sans toucher au contenu des colonnes.

-- 1. Drop des anciennes CHECK constraints (étaient trop restrictives).
alter table public.profiles drop constraint if exists profiles_currency_chk;
alter table public.profiles drop constraint if exists profiles_locale_chk;
alter table public.profiles drop constraint if exists profiles_country_chk;

-- 2. Réinstallation avec les listes V1.1.
--    NOT VALID = nouvelles écritures contrôlées, lignes existantes
--    jamais rejetées même si elles portent une valeur hors liste.
alter table public.profiles
  add constraint profiles_currency_chk
  check (currency in ('CHF','EUR','USD','GBP','CAD','TRY')) not valid;

alter table public.profiles
  add constraint profiles_locale_chk
  check (locale in (
    'fr','fr-CH','fr-FR',
    'en','en-US','en-GB',
    'de','it','es','pt',
    'hr','sr','bs','sq','tr','ar'
  )) not valid;

alter table public.profiles
  add constraint profiles_country_chk
  check (country in (
    'CH','FR','BE','DE','IT','GB','US',
    'CA','PT','ES','HR','RS','BA','AL','TR'
  )) not valid;

-- 3. Force PostgREST à dropper son cache schema. Sans ce NOTIFY le
--    client JS continuerait à utiliser l'ancienne définition pendant
--    quelques minutes et l'UPDATE depuis updateProfileLocale() ferait
--    une erreur "violates check constraint" pour toute combinaison
--    nouvellement supportée (CA, PT, ES, HR, RS, BA, AL, TR / it, hr,
--    sr, bs, sq, tr, ar / CAD, TRY).
notify pgrst, 'reload schema';
