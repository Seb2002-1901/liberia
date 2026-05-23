# LIBERIA

> Reprends le contrôle de ton argent.

Une application SaaS premium qui aide les utilisateurs à comprendre leur situation
financière, réduire le stress lié à l'argent et reconstruire une stabilité durable.

**Phase 1** — fondations production-ready. Aucune logique IA active à ce stade :
l'architecture, les calculs et le schéma de données sont conçus pour brancher
rapidement les phases IA suivantes (assistant, plan 90 jours, recommandations).

## Stack

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS** + composants type **shadcn/UI** (Radix Primitives)
- **Supabase** (Auth, Postgres, RLS, triggers)
- **Stripe** (préparation complète — checkout + webhook scaffold)
- **Framer Motion** · **Recharts** · **React Hook Form** · **Zod** · **Sonner**

## Démarrer

```bash
# 1. Installer les dépendances
npm install

# 2. Copier la configuration locale
cp .env.example .env.local
# puis remplir les variables Supabase / Stripe

# 3. Lancer
npm run dev
```

Sans configuration Supabase, l'app reste accessible : le dashboard et toutes les
pages affichent des données démo. Avec Supabase configuré et un utilisateur
connecté, les données réelles prennent le relais.

### Scripts

| commande | description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Démarre le build production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |

## Architecture

```
app/
  (marketing)/          # landing, pricing, legal/privacy/terms
  (auth)/               # login, register, forgot/reset password
  (app)/                # dashboard, budget, incomes, expenses, goals, profile, settings
  onboarding/           # onboarding multi-étapes (hors AppShell)
  demo/                 # dashboard démo public
  api/stripe/           # checkout + webhook
  auth/callback/        # callback Supabase OAuth / magic links
  actions/              # server actions (auth, finance, onboarding)

components/
  ui/                   # primitives (Button, Card, Dialog, …)
  layout/               # AppShell, BrandMark
  marketing/            # site header, sections, hero, pricing preview
  dashboard/            # StatCard, StabilityCard, charts
  finance/              # CRUD lists & forms (incomes, expenses, goals)
  auth/                 # forms d'auth
  onboarding/           # flow d'onboarding
  billing/              # CheckoutButton

lib/
  supabase/             # client browser / server / middleware
  stripe/               # config + server client
  validations/          # schémas Zod (auth, finance)
  calculations/         # logique financière (score, cashflow, runway, stress)
  constants/            # catégories, plans, routes
  demo/                 # jeu de données fictives premium
  services/             # accès données (Supabase + fallback démo)
  utils.ts              # cn(), formatters

types/                  # types TypeScript miroir du schéma SQL
supabase/schema.sql     # schéma + RLS + triggers (idempotent)
middleware.ts           # session refresh + redirections protégées
```

## Configuration

### Variables d'environnement (`.env.local`)

Voir `.env.example`. Les variables critiques :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — pour la synchronisation webhook
  en phase 2)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY`,
  `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY`

### Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, colle et exécute `supabase/schema.sql`.
3. Récupère `Project URL` et `anon key` (Settings → API).
4. Renseigne-les dans `.env.local`.

Voir `SUPABASE_SETUP.md` pour la procédure détaillée.

### Stripe

La structure est prête : checkout endpoint, webhook handler, types, plans.
Voir `STRIPE_SETUP.md` pour brancher les vrais price IDs.

### Déploiement

Voir `DEPLOYMENT.md`.

## Sécurité

- **Authentification** : Supabase Auth (cookies HTTP-only, refresh dans
  middleware).
- **RLS Postgres** : chaque utilisateur n'accède qu'à ses données via
  `auth.uid() = user_id`.
- **Validations** : tous les inputs traversent Zod côté client *et* côté
  server actions.
- **Server-only** : clés Stripe + service role isolées dans `lib/stripe/server`
  marqué `import "server-only"`.
- **Disclaimer** : LIBERIA n'est pas un conseil financier — disclaimer accessible
  depuis le footer et la page `/legal`.

Voir `SECURITY.md`.

## Phase 1 — état

- ✅ Landing + pricing + pages légales
- ✅ Auth Supabase (login, register, forgot, reset, callback)
- ✅ Onboarding 6 étapes
- ✅ AppShell premium (sidebar desktop + bottom nav mobile)
- ✅ Dashboard : score stabilité, stress, KPIs, cashflow, breakdown
- ✅ Budget / Revenus / Dépenses / Objectifs avec CRUD complet
- ✅ Profil / Paramètres / Abonnement
- ✅ Mode démo public (`/demo`)
- ✅ Stripe checkout + webhook scaffold
- ✅ Schéma Supabase + RLS
- ✅ Validations Zod sur tous les inputs
- ✅ Erreur 404, runtime error, loading states

## Prochaines phases (à ne PAS commencer ici)

- **Phase 2** : assistant IA, analyses comportementales, plan 90 jours.
- **Phase 3** : génération de revenus IA, optimisation investissement.
