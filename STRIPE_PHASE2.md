# Stripe — Phase 2 (production)

> **Doc historique.** Pour la configuration Stripe actuelle (clés, webhook, Customer
> Portal, trial, payment methods), suivre **STRIPE_SETUP.md** qui fait référence.

La Phase 2 active la vraie monétisation : persistance subscription via webhook
+ Customer Portal.

## 1. Variables d'env

```
STRIPE_SECRET_KEY=sk_live_... # sk_test_... en preview
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...

# Server-only — requis pour que le webhook puisse écrire dans subscriptions
SUPABASE_SERVICE_ROLE_KEY=...
```

## 2. Webhook persistance

`/api/stripe/webhook` (route handler) :

1. Vérifie la signature avec `STRIPE_WEBHOOK_SECRET`.
2. Insère l'`event.id` dans `stripe_events` (PK = idempotence).
3. Si l'event est déjà connu (`23505 unique_violation`) → 200 sans rejouer.
4. Sinon, dispatch :
   - `checkout.session.completed` → charge la subscription, upsert dans `subscriptions`.
   - `customer.subscription.created/updated/deleted` → upsert.
   - `invoice.paid` / `invoice.payment_failed` → upsert (recharge la subscription).

En cas d'erreur applicative pendant le dispatch, le row `stripe_events` est
supprimé pour que Stripe rejoue automatiquement.

L'upsert lui-même passe par la fonction Postgres `apply_subscription_event()`
définie dans `supabase/schema.sql`. Elle fait `INSERT … ON CONFLICT DO UPDATE
WHERE last_event_at < new` en une seule instruction SQL atomique, ce qui
empêche deux webhooks parallèles pour le même utilisateur d'écraser leurs
écritures respectives (l'ancien event ne peut pas réécrire par-dessus le
nouveau, peu importe l'ordre d'arrivée).

L'écriture passe par `getAdminClient()` (service-role, bypass RLS). C'est la
seule façon de toucher `subscriptions` côté serveur — la RLS bloque tout
écrit user-side (anti-fake-Premium fermé en Phase 1, 6e passe d'audit).

## 3. Customer Portal

`/api/stripe/portal` :

- Crée une session `stripe.billingPortal.sessions.create()`.
- Bouton "Gérer mon abonnement" affiché sur `/settings/subscription` quand
  `plan === "premium"` ET un `stripe_customer_id` existe.

Il faut activer le Customer Portal dans le dashboard Stripe avant la prod :
**Settings → Billing → Customer Portal → Activate**.

## 4. Webhook local (dev)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Le CLI affiche un `whsec_...` à coller dans `STRIPE_WEBHOOK_SECRET`.

Test du flow complet :

```bash
# Dans un autre terminal :
stripe trigger checkout.session.completed
# Vérifie dans Supabase Table editor que la row subscriptions
# correspondante a bien plan='premium' + stripe_subscription_id.
```

## 5. Webhook prod (Vercel)

Dans Stripe → **Developers → Webhooks** :

- Endpoint : `https://liberia.app/api/stripe/webhook`
- Events à écouter :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copie le `whsec_...` prod dans `STRIPE_WEBHOOK_SECRET`.

## 6. Test E2E (mode test Stripe)

1. Lance `npm run dev`.
2. Connecte-toi avec un compte test.
3. Va sur `/settings/subscription` → "Passer Premium".
4. Carte test : `4242 4242 4242 4242`, date future, CVC 123.
5. Tu reviens sur `/settings/subscription?status=success`.
6. Webhook reçu, row `subscriptions.plan` passe à `premium`.
7. Le badge `Premium` apparaît, la limite "1 goal" disparaît.
8. Clique "Gérer mon abonnement" → portail Stripe → annule.
9. Webhook `customer.subscription.deleted` → row repasse à `plan='free'`.

## 7. Idempotence

Stripe peut livrer un event plusieurs fois. La table `stripe_events` garantit
qu'on ne le traite qu'une seule fois grâce à la PK sur `event.id`. Si tu
remarques `23505 unique_violation` dans les logs Vercel, c'est normal — c'est
une réception dédupliquée et l'API renvoie 200 `{ deduped: true }`.

## 8. Roadmap

- Webhook signing key rotation (sans downtime).
- Email de bienvenue Premium via Resend.
- Coupons / promotion codes (déjà activé sur le Checkout).
