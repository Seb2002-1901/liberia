-- Sprint Coach IA — Phase 5+ : assure que les colonnes user_settings
-- utilisées par /settings et settings-preferences.tsx existent en prod.
--
-- Avant cette migration, les SaaS users déployés depuis un schéma
-- initial (sans les ALTER plus loin dans schema.sql) voyaient :
--   toast "Could not find column 'email_inactivity_followup'"
--   toast "Could not find column 'email_goal_milestones'"
--   toast "Could not find column 'analytics_opt_out'"
--   toast "Could not find column 'email_encouragement'"
--   toast "Could not find column 'email_trial_reminders'"
--   toast "Could not find column 'coach_memory_enabled'"
--
-- Idempotent — chaque colonne est add column if not exists, défaults
-- alignés sur schema.sql (opt-out model : true sauf analytics_opt_out).

alter table public.user_settings
  add column if not exists email_encouragement boolean not null default true,
  add column if not exists email_trial_reminders boolean not null default true,
  add column if not exists email_goal_milestones boolean not null default true,
  add column if not exists email_inactivity_followup boolean not null default true;

alter table public.user_settings
  add column if not exists analytics_opt_out boolean not null default false;

-- Used by /settings/memory toggle "coach memory enabled" — vit dans
-- public.profiles (pas user_settings) car c'est une préférence
-- "identité" plus que "notifications".
alter table public.profiles
  add column if not exists coach_memory_enabled boolean not null default true;

-- Sprint Coach IA — ajout des colonnes nécessaires aux nouveaux outils
-- "propose_income" / "propose_goal" / "propose_budget" si jamais elles
-- manquent (table incomes a déjà notes/frequency, on documente seulement).
-- Pas d'ALTER ici — incomes/expenses/goals/category_budgets ont déjà
-- les colonnes nécessaires (cf. schema.sql).
