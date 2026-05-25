# Déploiement & Lancement production

Guide opérateur pour mettre LIBERIA en ligne. Suit l'ordre exact
d'intégration : commencer par les vraies clés bloquantes (Supabase +
Stripe + APP_URL), puis ajouter les recommandés (Anthropic + Resend +
Cron), puis les optionnels (Sentry, Upstash, Admin).

> **Important** : le check de préparation en temps réel est visible
> dans `/admin` (page « Préparation production »). C'est la source
> de vérité pendant le rollout.

---

## 0. Pré-vol

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Tous doivent passer sans warning bloquant.

---

## 1. Vercel — création du projet

1. Push le repo sur GitHub.
2. Vercel → **Add New** → **Project** → Import.
3. Vercel détecte Next.js automatiquement. Pas de build override
   nécessaire.
4. Déploie sans envs au premier coup — l'app boote en mode
   non-configuré (tout est no-op safe). Tu verras les pages
   marketing s'afficher.

---

## 2. Domaine + APP_URL

1. Vercel → **Settings** → **Domains** → ajoute ton domaine custom.
2. Configure les DNS (CNAME ou A record) selon les instructions
   Vercel.
3. Une fois résolu, **mets à jour `NEXT_PUBLIC_APP_URL`** en prod
   avec l'URL finale (ex. `https://liberia.app`). Sans cette
   variable, Stripe redirige vers `http://localhost:3000` après
   checkout — bug visible utilisateur.

---

## 3. Supabase (REQUIS — sans ça, rien ne marche)

### Création projet
1. https://supabase.com → New project → région EU (ex. Frankfurt).
2. Récupère depuis **Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (**server-only**)

### Schéma
3. Dans **SQL Editor**, colle et exécute le contenu de
   `supabase/schema.sql`. Le fichier est idempotent — safe à
   re-exécuter sur une DB déjà déployée.

### Auth URLs
4. **Authentication → URL Configuration** :
   - Site URL : `https://liberia.app`
   - Redirect URLs (ajoute les 2) :
     - `https://liberia.app/auth/callback`
     - `http://localhost:3000/auth/callback` (pour le dev)
5. **Authentication → Email Templates** (optionnel) : personnalise
   les textes français de confirmation / reset password.

### Sanity check
6. Ouvre `/admin` (après s'être connecté avec le user admin) — la
   carte « Préparation production » doit afficher Supabase + admin
   comme OK.

---

## 4. Stripe (REQUIS pour facturer)

Voir `STRIPE_SETUP.md` pour le détail. Résumé ordre opérationnel :

### Mode Test d'abord
1. Active le **Test mode** dans le Dashboard Stripe.
2. Crée le produit **« LIBERIA Premium »** + 2 prix CHF :
   - `14.99 CHF / mois` → note le `price_id`
   - `119.99 CHF / an` → note le `price_id`
3. Ajoute les envs Vercel (Test) :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_test_...
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_test_...
   ```
4. **Developers → Webhooks → Add endpoint** :
   - URL : `https://liberia.app/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.paid`, `invoice.payment_failed`
   - Copie le `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
5. Test end-to-end : connecte-toi, va sur `/settings/subscription`,
   clique « Commencer l'essai mensuel », paie avec
   `4242 4242 4242 4242`. Vérifie que la ligne dans Supabase
   `subscriptions` apparaît avec `status=trialing`, `trial_used=true`.

### Customer Portal
6. **Settings → Billing → Customer Portal** :
   - Active **Update payment method**
   - Active **Cancel subscriptions** (recommandé : « at end of period »)
   - URL de retour : `https://liberia.app/settings/subscription`

### Moyens de paiement
7. **Settings → Payment methods** : active TWINT (Suisse seulement,
   nécessite un compte Stripe basé en Suisse avec prix CHF). Cards +
   Apple Pay + Google Pay sont actifs par défaut. Ils apparaissent
   automatiquement au checkout via la config Dashboard — le code n'a
   rien à changer (Stripe API ne supporte pas
   `automatic_payment_methods` en mode subscription).

### Passage Live
8. Une fois le test validé, bascule Stripe en **Live mode**.
9. Re-crée le même produit + prix EN LIVE → nouveaux `price_id`.
10. Remplace les envs Vercel :
    ```
    STRIPE_SECRET_KEY=sk_live_...
    NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_live_...
    NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_live_...
    ```
11. Re-crée le webhook LIVE (URL identique) → nouveau `whsec_…` →
    update `STRIPE_WEBHOOK_SECRET` en prod.

---

## 5. Anthropic (recommandé — coach IA)

Sans Anthropic, le coach utilise un fallback local déterministe — il
fonctionne mais avec moins de richesse.

1. https://console.anthropic.com → Settings → API keys → Create key.
2. Vercel env : `ANTHROPIC_API_KEY=sk-ant-...`
3. Vérifie `/admin` : la carte « Préparation production » doit
   marquer Anthropic comme OK.

Voir `AI_SETUP.md` pour les détails (modèle, max_tokens, coûts).

---

## 6. Resend (recommandé — emails)

Sans Resend, les emails sont silencieusement no-op'és (récap hebdo,
trial-ending, etc).

1. https://resend.com → API Keys → Create.
2. **Domains** → ajoute `liberia.app` (ou ton domaine) → suit les
   instructions DNS (SPF + DKIM + DMARC). Domaine non vérifié = pas
   d'envoi.
3. Vercel env :
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=LIBERIA <coach@liberia.app>
   ```
4. Test : `/admin` doit afficher Resend OK. Le cron hebdo s'enverra
   dimanche 8h UTC (configuré dans `vercel.json`).

---

## 7. Cron secret (recommandé — pour le récap hebdo)

Vercel Cron **définit automatiquement `CRON_SECRET`** dans les envs
du projet quand tu actives un cron. Vérifie dans Vercel → Settings →
Environment Variables qu'il existe (en lecture seule). Sans cette
variable, l'endpoint `/api/cron/weekly-recap` renvoie 503 (fail
closed — anti-spam-relay).

---

## 8. Optionnels

### Sentry (observabilité)
1. https://sentry.io → Create project (Next.js).
2. Vercel env :
   ```
   SENTRY_DSN=https://...
   NEXT_PUBLIC_SENTRY_DSN=https://...
   ```
   Le SDK strip déjà la PII (emails, cookies, auth headers) dans
   `sentry.server.config.ts`.

### Upstash Redis (rate-limit)
1. https://upstash.com → Create Redis (région EU).
2. Vercel env :
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
   Sans Upstash, le rate-limit fail-open silencieusement (acceptable
   en dev, à activer pour la prod).

### Admin (`/admin`)
1. Connecte-toi une fois en prod pour créer ton user Supabase.
2. **Supabase → Authentication → Users** → copie ton UUID.
3. Vercel env : `ADMIN_USER_IDS=<ton-uuid>` (CSV si plusieurs admins).
4. `/admin` devient accessible (404 sinon).

---

## 9. Smoke test post-déploiement

Après chaque déploiement majeur, vérifie dans cet ordre :

1. **Homepage** `/` charge en < 2s.
2. **Inscription** `/register` → email confirmation → reset password
   marche.
3. **Onboarding** complet → wow moment s'affiche.
4. **Dashboard** : DailyInsightCard rend, pas de "Mode démo" qui
   traîne, pas de 0 CHF partout (vérifie avec des données réelles).
5. **Coach** : envoie un message → réponse arrive (fallback local
   acceptable si Anthropic absent).
6. **Plan** `/plan` : starter plan s'affiche avec ton tier (struggling
   / tight / stable / comfortable).
7. **Settings** `/settings` → toggles fonctionnent.
8. **Subscription** `/settings/subscription` → essai démarre, redirige
   vers Stripe Checkout.
9. **Webhook Stripe** : dans Stripe Dashboard → Webhooks → l'endpoint
   reçoit des 200. Vérifie que la ligne `subscriptions` est créée.
10. **`/admin`** : carte « Préparation production » verte (tous les
    requis OK).
11. **Pages légales** `/privacy`, `/terms`, `/legal`, `/security`,
    `/ai-policy` rendent.

---

## 10. Rollback

LIBERIA suit un pattern **strictement additif** :
- Schema migrations : `add column if not exists`, `do $$ if not
  exists $$;` — toujours safe en avant, jamais destructif.
- Code releases : Vercel preserve les déploiements précédents → un
  clic dans Vercel → Deployments → Promote pour revenir.

**Cas spéciaux** :
- Si tu as déjà appliqué un nouveau schéma SQL et tu rollback le
  code, le schéma reste plus avancé que le code → safe (les colonnes
  supplémentaires sont juste ignorées).
- Le RPC `apply_subscription_event` est en `CREATE OR REPLACE
  FUNCTION` — rolling back ne casse pas le webhook tant que sa
  signature reste compatible (elle l'est depuis la phase business).

---

## 11. Variables d'env — récap

| Variable | Type | Requis prod ? | Sans valeur |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | ✅ Oui | Redirects Stripe cassés |
| `NEXT_PUBLIC_SUPABASE_URL` | public | ✅ Oui | Auth/DB KO |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | ✅ Oui | Auth/DB KO |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | ✅ Oui | Webhook + admin KO |
| `STRIPE_SECRET_KEY` | **server-only** | ✅ Oui (live) | Pas de checkout |
| `STRIPE_WEBHOOK_SECRET` | **server-only** | ✅ Oui (live) | Webhook 400 |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY` | public | ✅ Oui | Checkout mensuel KO |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY` | public | ✅ Oui | Checkout annuel KO |
| `ANTHROPIC_API_KEY` | **server-only** | Recommandé | Fallback coach local |
| `RESEND_API_KEY` | **server-only** | Recommandé | Emails no-op |
| `RESEND_FROM_EMAIL` | server-only | Optionnel | Défaut `LIBERIA <coach@liberia.app>` |
| `CRON_SECRET` | **server-only** | Recommandé | Cron renvoie 503 |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | **server-only** | Optionnel | Rate-limit fail-open |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | mixed | Optionnel | Pas d'observabilité erreurs |
| `ADMIN_USER_IDS` | **server-only** | Optionnel | `/admin` renvoie 404 |

> **Privacy** : aucune variable préfixée `NEXT_PUBLIC_` ne doit
> contenir un secret. Toutes les autres restent server-side via Next.js
> runtime — vérifié par le fichier `lib/env.ts` + commentaires
> explicites partout.

---

## 12. Checklist finale opérateur

- [ ] DNS du domaine résolu
- [ ] `NEXT_PUBLIC_APP_URL` mis à jour avec l'URL prod finale
- [ ] Supabase schema appliqué (idempotent)
- [ ] Supabase auth URLs configurées
- [ ] Stripe Live mode activé
- [ ] 2 prices CHF créés en Live → IDs dans Vercel
- [ ] Webhook Live activé → `whsec_…` Live dans Vercel
- [ ] Customer Portal configuré (cancel + update payment)
- [ ] TWINT activé dans Stripe Dashboard (si visé)
- [ ] Anthropic clé en prod
- [ ] Resend domaine vérifié + clé en prod
- [ ] `ADMIN_USER_IDS` set avec ton UUID
- [ ] Smoke test 11 points (section 9)
- [ ] `/admin` → carte « Préparation production » verte
