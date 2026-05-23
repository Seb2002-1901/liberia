# Stripe — Configuration

> Phase 1 : structure complète prête. La synchronisation `subscriptions ↔ Supabase`
> via webhook se finalise en phase 2 (avec le client `service_role`).

## 1. Comptes & produits

1. Crée un compte [Stripe](https://dashboard.stripe.com).
2. **Products** → crée **LIBERIA Premium**.
3. Ajoute deux **prices** (mode subscription) :
   - 9,90 € / mois → note le `price_id`
   - 89 € / an → note le `price_id`

## 2. Variables d'env

Dans `.env.local` :

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # voir étape 3
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...
```

> Le `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` n'est volontairement pas requis en
> Phase 1 — on ne charge pas Stripe.js côté client, le Checkout passe par
> `stripe.checkout.sessions.create()` server-side. Il sera ajouté en Phase 2
> avec le Customer Portal et Elements éventuels.

## 3. Webhook local (Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Le CLI affichera un `whsec_…` à coller dans `STRIPE_WEBHOOK_SECRET`.

Le handler vérifie déjà la signature et accepte les events suivants :

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

La persistance dans la table `subscriptions` est laissée à la phase 2 pour
éviter d'exposer le service role avant que la stratégie d'audit ne soit
finalisée.

## 4. Test du checkout

1. Connecte-toi dans l'app.
2. Va sur `/settings/subscription`.
3. Clique **Passer Premium** : tu es redirigé vers Stripe Checkout.
4. Utilise une carte test (`4242 4242 4242 4242`, date future, CVC `123`).
5. Tu reviens sur `/settings/subscription?status=success`.

## 5. Production

- Ajoute les URLs prod dans **Stripe → Developers → Webhooks**.
- Active la **Customer Portal** Stripe (Settings → Billing → Customer Portal)
  pour permettre l'annulation en self-service en phase 2.
