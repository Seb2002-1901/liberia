# Stripe — Configuration

LIBERIA fonctionne sur un modèle **essai gratuit 14 jours, puis abonnement
automatique** (carte requise dès l'inscription au checkout). Pas de plan
gratuit permanent.

## 1. Produits & prix

1. Crée un compte [Stripe](https://dashboard.stripe.com) (mode Test puis Live).
2. **Products → New product** → "LIBERIA Premium".
3. Ajoute deux **prices récurrents en CHF** :
   - **Mensuel** : `14.99 CHF` / mois → note le `price_id` (`price_…`)
   - **Annuel** : `119.99 CHF` / an → note le `price_id` (`price_…`)

> ⚠️ Les prix doivent être créés en **CHF**, pas en EUR. LIBERIA cible le
> marché suisse en priorité.

## 2. Variables d'env

Dans `.env.local` (dev) et dans Vercel → Project → Settings → Environment
Variables (prod) :

```
STRIPE_SECRET_KEY=sk_live_...                  # ou sk_test_... en dev
STRIPE_WEBHOOK_SECRET=whsec_...                # voir étape 4
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...
NEXT_PUBLIC_APP_URL=https://liberia-wine.vercel.app   # origine de confiance pour les redirects
```

Le `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` n'est pas requis : le Checkout passe
par `stripe.checkout.sessions.create()` côté serveur et redirige vers une URL
Stripe hébergée. Seul `STRIPE_SECRET_KEY` (jamais `NEXT_PUBLIC_`) doit
manipuler l'API privée.

## 3. Moyens de paiement

Dans **Stripe Dashboard → Settings → Payment methods**, active :

- **Cards** (Visa / Mastercard / American Express) — actif par défaut
- **Apple Pay** — actif par défaut, fonctionne dès qu'`automatic_payment_methods`
  est activé côté API
- **Google Pay** — actif par défaut, idem
- **TWINT** — **doit être activé manuellement** dans le Dashboard avant
  d'être proposé au checkout. Stripe l'autorise pour les comptes basés en
  Suisse (CHF requis). Une fois activé, il apparaît automatiquement pour
  les utilisateurs suisses lors du Checkout — aucun changement de code requis,
  notre Checkout utilise `payment_method_collection: "always"` qui suit la
  configuration Dashboard.

> Si TWINT ne s'affiche pas : vérifier (1) que le compte Stripe est basé en
> Suisse, (2) que les prix sont en CHF, (3) que TWINT est bien coché dans
> Payment methods, (4) que l'utilisateur est détecté comme suisse.

## 4. Webhook

### En local (Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Le CLI affiche un `whsec_…` à coller dans `STRIPE_WEBHOOK_SECRET`.

### En production

**Stripe Dashboard → Developers → Webhooks → Add endpoint** :

- URL : `https://liberia-wine.vercel.app/api/stripe/webhook`
- Events à écouter :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copie le **Signing secret** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` côté
Vercel (Production env).

Le handler vérifie la signature, déduplique via `stripe_events` (idempotence
au niveau Postgres), puis appelle l'RPC `apply_subscription_event` qui
écrit atomiquement dans `public.subscriptions` (avec garde anti out-of-order
via `last_event_at`).

## 5. Comportement essai gratuit

- Premier checkout : `trial_period_days = 14`, carte capturée mais non
  débitée. À l'expiration, Stripe prélève automatiquement.
- Anti-abus : `trial_used = true` est posé en base dès que la souscription
  passe en `trialing`/`active`/`past_due`. Le flag n'est jamais remis à
  `false` (cf. `apply_subscription_event`). Si l'utilisateur annule puis
  revient, le second checkout démarre **sans** période d'essai (paiement
  immédiat).
- `trial_settings.end_behavior.missing_payment_method = "pause"` : si la
  carte est retirée pendant le trial, Stripe met l'abonnement en pause au
  lieu de tenter une charge échouée — l'utilisateur peut reprendre via le
  portail.

## 6. Customer Portal

**Stripe Dashboard → Settings → Billing → Customer Portal** :

- Active **Update payment method**
- Active **Cancel subscriptions** (au choix : immédiat ou en fin de période)
- Active **Switch plans** entre Mensuel et Annuel
- Configure les URLs de retour vers `https://liberia-wine.vercel.app/settings/subscription`

Le bouton "Gérer mon abonnement" dans l'app ouvre une session portail via
`POST /api/stripe/portal`.

## 7. Test du checkout

1. Connecte-toi dans l'app.
2. Va sur `/settings/subscription`.
3. Choisis Mensuel ou Annuel → tu es redirigé vers Stripe Checkout.
4. Carte de test : `4242 4242 4242 4242`, date future, CVC `123`.
5. Tu reviens sur `/settings/subscription?status=success`.
6. Vérifie côté Supabase que la ligne `subscriptions` a bien `status =
   'trialing'`, `trial_used = true`, `price_id = price_...`, `current_period_end`
   ~14 jours plus tard.

Pour tester le passage trial → active : `stripe trigger
customer.subscription.updated` ou avance l'horloge dans le sandbox Stripe.

## 8. Sécurité

- `STRIPE_SECRET_KEY` : **uniquement** côté serveur. Jamais préfixé
  `NEXT_PUBLIC_`. Vérifié à chaque audit.
- `STRIPE_WEBHOOK_SECRET` : **uniquement** côté serveur. Le handler refuse
  les requêtes sans signature valide (HTTP 400).
- Les redirects Checkout utilisent `NEXT_PUBLIC_APP_URL` comme origine de
  confiance — jamais le header `Origin` (contrôlé par le client).

## 9. Limitations connues

### Double-checkout simultané

Si un utilisateur clique « Mensuel » dans un onglet et « Annuel » dans un
autre dans la même fraction de seconde, le rate-limit Upstash (10 req/min)
+ l'état `loading` du bouton CheckoutButton couvrent 99 % des cas, mais
deux sessions Checkout peuvent en théorie être créées si la course est
plus rapide que le premier round-trip. Le webhook met `subscriptions`
unique par `user_id` donc une seule ligne en DB, mais Stripe pourrait
facturer deux abonnements en parallèle. **Mitigation opérateur** :
surveiller le Stripe Dashboard pour les abonnements doublons sur un
même Customer, rembourser/annuler manuellement via le portail si
détecté.

### Suppression de compte ≠ suppression Stripe Customer

`/api/settings → deleteAccount` supprime l'utilisateur Supabase (cascade
sur toutes les tables) mais laisse le Stripe Customer + abonnement
intacts (pour audit / éventuel remboursement post-suppression). Annuler
le sub via Stripe Dashboard si nécessaire. Documenté côté SECURITY.md.

### Anti-abus trial limité au compte LIBERIA

`trial_used` est attaché au row `subscriptions` (unique par user_id).
Un utilisateur qui supprime son compte LIBERIA puis se ré-inscrit avec
une **adresse email différente** obtient un nouveau trial — l'anti-abus
email-based est limité par nature (changement d'email facile). À
durcir post-launch si on observe de l'abus (fingerprint device,
fingerprint paiement Stripe Radar, etc.).
