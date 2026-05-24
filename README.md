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

## Phase 1 — état (validée définitivement)

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

## Phase 2 — état

- ✅ **Coach IA** (`/coach`) — chat streaming Claude Sonnet 4.6 avec prompt
  caching, adaptive thinking, sidebar conversations, historique, renommage,
  suppression. Contexte financier réel (revenus/dépenses/objectifs/scores) injecté
  à chaque tour.
- ✅ **Stripe persistance** — webhook signature-verified, idempotence via
  `stripe_events`, écriture service-role dans `subscriptions`. Customer
  Portal Stripe activable depuis `/settings/subscription`.
- ✅ **Hardening** — Upstash rate-limit (Stripe 10/min, IA 30/min/user),
  Sentry (server + client + edge avec PII strip), validation env Zod.
- ✅ **Insights dashboard** — widget non-IA qui surface 3 repères concrets
  + bouton vers le coach.
- ✅ Tables IA : `ai_conversations`, `ai_messages` avec RLS self-only +
  ledger `stripe_events` server-only.

Setup pas-à-pas : [AI_SETUP.md](./AI_SETUP.md), [STRIPE_PHASE2.md](./STRIPE_PHASE2.md),
[SENTRY_SETUP.md](./SENTRY_SETUP.md), [UPSTASH_SETUP.md](./UPSTASH_SETUP.md).

## Phase 3 — état

- ✅ **Plan IA 30/60/90 jours** (`/plan`) — génération via Anthropic
  tool-use (Sonnet 4.6, JSON structuré strict validé Zod). Timeline par
  semaine, validation des étapes, régénération.
- ✅ **Notifications hebdo email** — Resend + cron Vercel chaque dimanche.
  Préférences utilisateur + unsubscribe par lien (token RGPD-friendly).
- ✅ **Settings RGPD** — export complet des données utilisateur (JSON),
  suppression définitive du compte (cascade cleanup).
- ✅ **Tests automatisés** — Vitest (34 unitaires : calculs, schémas,
  redirects), Playwright (smoke 8 routes publiques), GitHub Actions CI.
- ✅ **Dashboard widget plan** — montre la prochaine étape et la progression.

Setup pas-à-pas : [PLAN_PHASE3.md](./PLAN_PHASE3.md),
[EMAIL_SETUP.md](./EMAIL_SETUP.md), [TESTS_SETUP.md](./TESTS_SETUP.md).

## Roadmap

- Plan archives + comparaison
- Streaming de la génération plan
- Génération de revenus IA (coaching side-projects)
- Customer Portal enrichi (changement plan in-app)
- Internationalisation (en/es)
- Realtime sync multi-tab
- Mobile coach Sheet drawer natif
