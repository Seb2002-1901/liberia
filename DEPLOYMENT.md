# Déploiement

LIBERIA est conçu pour **Vercel** (zero-config Next.js).

## 1. Provider

Push le repo sur GitHub puis :

```
Vercel → Add New → Project → Import
```

Choisis le repo. Vercel détecte Next.js automatiquement.

## 2. Variables d'env

Dans **Project Settings → Environment Variables**, ajoute :

| clé | environnement |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | tous (URL prod, ex. `https://liberia.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | tous |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tous |
| `SUPABASE_SERVICE_ROLE_KEY` | **production uniquement** |
| `STRIPE_SECRET_KEY` | tous (Phase 1 : peut rester vide en preview) |
| `STRIPE_WEBHOOK_SECRET` | tous (Phase 1 : peut rester vide en preview) |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY` | tous |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY` | tous |

## 3. Configuration Supabase

Dans Supabase **Authentication → URL Configuration** :

```
Site URL              https://liberia.app
Redirect URLs         https://liberia.app/auth/callback
                      http://localhost:3000/auth/callback
```

## 4. Configuration Stripe

Dans Stripe → **Developers → Webhooks** :

- Endpoint : `https://liberia.app/api/stripe/webhook`
- Events : `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copie le `whsec_…` dans `STRIPE_WEBHOOK_SECRET` (prod).

## 5. Domaine

- Ajoute ton domaine custom dans Vercel (Settings → Domains).
- Reconfigure `NEXT_PUBLIC_APP_URL` + Site URL Supabase + endpoint Stripe.

## 6. Checklist avant prod

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Toutes les variables d'env sont set en prod
- [ ] Le SQL `supabase/schema.sql` a été exécuté sur la base prod
- [ ] Auth → URLs prod ajoutées
- [ ] Stripe webhook prod actif
- [ ] Pages légales (`/privacy`, `/terms`, `/legal`) relues
