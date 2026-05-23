# Supabase — Configuration

## 1. Créer un projet

1. Va sur [supabase.com](https://supabase.com) → **New project**.
2. Choisis une région UE (Paris, Frankfurt) pour la conformité RGPD.
3. Note le mot de passe DB (tu en auras besoin pour les migrations).

## 2. Schéma

Dans **SQL Editor** :

1. Ouvre `supabase/schema.sql` à la racine du projet.
2. Copie tout, colle dans l'éditeur Supabase, exécute.

Tu obtiens :

- 7 tables : `profiles`, `subscriptions`, `financial_profiles`,
  `incomes`, `expenses`, `goals`, `user_settings`
- Triggers `updated_at` sur toutes les tables
- Trigger `on_auth_user_created` qui crée automatiquement un `profiles`,
  un `subscriptions` (plan `free`) et un `user_settings` quand un utilisateur
  s'inscrit
- RLS activée partout, policies `self_select / self_insert / self_update /
  self_delete` filtrant via `auth.uid() = user_id`

Le script est **idempotent** : tu peux le ré-exécuter sans casser quoi que
ce soit.

## 3. Auth

Dans **Authentication → Providers** :

- Active **Email**.
- Active **Confirm email** si tu veux la double opt-in (recommandé en prod).
- (Optionnel) ajoute Google / Apple pour plus tard.

Dans **Authentication → URL Configuration**, ajoute :

```
Site URL              http://localhost:3000   (puis ton domaine prod)
Redirect URLs         http://localhost:3000/auth/callback
                      https://ton-domaine/auth/callback
```

## 4. Variables d'env

Settings → API :

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
  (server-only, ne JAMAIS exposer côté client)

## 5. Vérifier

```bash
npm run dev
```

- Crée un compte sur `/register`
- Vérifie dans le dashboard Supabase **Table editor** :
  - `profiles` a une ligne avec ton email
  - `subscriptions` a une ligne `plan = free`
  - `user_settings` a une ligne

Si oui : l'onboarding peut se lancer, le dashboard chargera tes données.
