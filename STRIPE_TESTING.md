# Stripe — Protocole de Test Live

**Sprint S3** — Procédure de validation end-to-end Stripe avant ouverture commerciale.

Tous les flux sont testables localement avec `stripe-cli` + un compte Stripe en **mode Test**. Sur Vercel preview, les mêmes commandes s'appliquent en pointant `--forward-to` vers l'URL preview.

---

## Prérequis

1. **Stripe CLI installé** : `brew install stripe/stripe-cli/stripe` (macOS) ou [docs](https://docs.stripe.com/stripe-cli).
2. **Compte Stripe Test** (clé `sk_test_*`, jamais `sk_live_*` en CI).
3. **Variables d'environnement** (`.env.local` ou Vercel) :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...           # fourni par `stripe listen` (cf. infra)
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_...
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY=price_...
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
   NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...
   ```
4. **Supabase** : projet de test avec migrations appliquées (table `subscriptions`, `stripe_events`, RPC `apply_subscription_event`).

---

## 1. Bootstrap — `stripe listen`

```bash
# Forward tous les events Stripe vers le webhook local. Cette commande
# imprime un `whsec_*` à mettre dans STRIPE_WEBHOOK_SECRET puis redémarrer
# le serveur Next.
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Vérification** : la console doit afficher
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Sur Vercel preview : remplacer `localhost:3000` par `https://<preview-url>.vercel.app`.

---

## 2. Scénarios de validation

### 2.1 Checkout → trial → active

```bash
# Étape 1 — UI : aller sur /settings/subscription, cliquer "Commencer
# l'essai mensuel" (plan Premium).
# Étape 2 — Stripe Checkout s'ouvre. Carte test :
#   4242 4242 4242 4242 / 12/30 / 123 / 75001
# Étape 3 — Stripe redirige sur /settings/subscription?status=success
```

**Events attendus dans `stripe listen`** :
1. `checkout.session.completed` → webhook insère `stripe_events` + RPC met `subscriptions.status = trialing`, `plan = premium`.
2. `customer.subscription.created` → idem (redondance volontaire, idempotence via `last_event_at`).

**SQL de vérification** :
```sql
select user_id, status, plan, trial_ends_at, cancel_at_period_end, stripe_customer_id
from subscriptions where user_id = '<uid>';
-- status = 'trialing', plan = 'premium', trial_ends_at ≈ now() + 14 days
```

### 2.2 Trial → active (fin d'essai, paiement réussi)

```bash
# Simule la fin du trial + paiement réussi.
stripe trigger customer.subscription.updated \
  --add subscription:status=active \
  --add subscription:trial_end=$(date -d '-1 day' +%s)
```

**Attendu** : `subscriptions.status = active`, `trial_used = true`, `current_period_end` mis à jour.

### 2.3 Cancel pendant le trial

```bash
# Côté UI : /settings/subscription → "Gérer mon abonnement" → portail
# Stripe → "Cancel subscription". OU via CLI :
stripe subscriptions cancel <sub_id>
```

**Events attendus** :
1. `customer.subscription.updated` (`cancel_at_period_end = true`) ou
2. `customer.subscription.deleted` (cancel immédiat).

**SQL** :
```sql
select status, cancel_at_period_end, current_period_end from subscriptions where user_id = '<uid>';
-- status: 'canceled' (immediate) ou 'active' avec cancel_at_period_end=true (fin de période)
```

### 2.4 Resubscribe après cancel (anti-abuse trial)

```bash
# 1. Cancel comme ci-dessus
# 2. Sur /settings/subscription, cliquer "Commencer l'essai mensuel"
# 3. Vérifier dans la console serveur : trialDays calculé = 0 (et non 14)
```

**Code branché** (`app/api/stripe/checkout/route.ts` lignes 90–96) :
```ts
const trialDays = existingSub?.trial_used ? 0 : TRIAL_DAYS;
```

Le user paie IMMÉDIATEMENT — pas de second essai gratuit.

### 2.5 Payment failed (carte refusée au renouvellement)

```bash
# Simule un échec de paiement de renouvellement.
stripe trigger invoice.payment_failed
```

**Events attendus** :
1. `invoice.payment_failed` → webhook récupère la subscription → status devient `past_due`.
2. La UI `/settings/subscription` rend la **BillingState lapsed/past_due** : banner warning + CTA portail Stripe (page existante, cf. `inferBillingState`).

**Tester la réparation** :
```bash
# Le user met une nouvelle carte via le portail Stripe.
# Stripe renvoie automatiquement invoice.paid.
stripe trigger invoice.paid
```

**Attendu** : `subscriptions.status = active`, paywall réouvert.

### 2.6 Trial sans carte → pause

```bash
# Simule un trial qui se termine SANS payment method.
stripe trigger customer.subscription.updated \
  --add subscription:status=paused
```

**Attendu** : `subscriptions.status = paused` → `inferBillingState` retourne `lapsed`. UI montre soft paywall + CTA portail.

---

## 3. Tests automatisés

### Unit (vitest)

- `tests/unit/billing-state.test.ts` : matrice complète Stripe status → BillingState (covered).
- `tests/unit/access-server.test.ts` : status → AccessState (paywall surfaces).
- `tests/unit/delete-account.test.ts` : Stripe cancel best-effort dans le flux de suppression de compte.

### E2E boundary (playwright)

- `tests/e2e/stripe-flows.spec.ts` : valide les codes 401 / 400 / 501 aux endpoints (auth, body invalide, signature manquante). Skip-friendly si env Stripe absente.

### E2E live (manuel)

Pas automatisable en CI : nécessite `stripe-cli` + un humain qui clique sur la UI Checkout. Documenté ci-dessus.

---

## 4. Checklist avant ouverture commerciale

- [ ] `stripe listen` connecté à preview Vercel pendant 1 h sans webhook 5xx.
- [ ] Scénario 2.1 testé jusqu'au `status=trialing` en DB.
- [ ] Scénario 2.2 testé (`status=active`).
- [ ] Scénario 2.3 testé (immediate cancel + period-end cancel).
- [ ] Scénario 2.4 testé : 2e essai → `trialDays = 0`, paiement immédiat.
- [ ] Scénario 2.5 testé : `past_due` → portail → réparation.
- [ ] Scénario 2.6 testé : `paused`.
- [ ] Dashboard Stripe → Webhooks → 100 % de delivery success sur les 24 dernières h.
- [ ] Migration `apply_subscription_event` RPC déployée (Supabase SQL editor).
- [ ] Methods de paiement activées dans Stripe Dashboard : cartes, Apple Pay, Google Pay, TWINT (CH).
- [ ] Mode **Live** activé dans Stripe (bascule `sk_live_*` + nouveau `whsec_*` Live dans Vercel).

---

## 5. Annexe — cartes test Stripe

| Cas | Carte | Comportement |
|---|---|---|
| Succès | `4242 4242 4242 4242` | Paiement OK |
| Refusée (generic) | `4000 0000 0000 0002` | `invoice.payment_failed` |
| Refusée (insufficient funds) | `4000 0000 0000 9995` | `invoice.payment_failed` |
| 3D Secure requis | `4000 0027 6000 3184` | Force la flow SCA |
| Carte expirée | `4000 0000 0000 0069` | `expired_card` error |

Toutes les autres infos peuvent être bidons (12/30 / 123 / 75001).
