# LIBERIA — Production Readiness Report

**Sprint S2-BIS** — 14 juin 2026

État du projet, blocages avant vente publique, et environment variables.

---

## Pile de validation

| Step | État | Détail |
|---|---|---|
| `pnpm typecheck` | ✅ | 0 erreur |
| `pnpm lint` | ✅ | 0 warning |
| `pnpm test` | ✅ | 1031 tests, 74 suites |
| `pnpm build` | ✅ | Production build OK |
| `pnpm test:e2e` | ⚠️ | Stripe e2e ajoutés mais nécessitent serveur démarré + env |

---

## Environment variables — Vercel

### OBLIGATOIRES (production)

| Variable | Surface | Sans elle... |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + DB | App = read-only stub. Pas de session. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + DB | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook Stripe, cron | webhook ne persiste pas les subscriptions |
| `NEXT_PUBLIC_APP_URL` | Stripe redirects + OAuth | open-redirect risk → bloqué côté code, mais redirects KO |
| `STRIPE_SECRET_KEY` | Checkout, portal | endpoints retournent 501 |
| `STRIPE_WEBHOOK_SECRET` | Webhook | webhook rejette tous les events 400 |
| `NEXT_PUBLIC_STRIPE_PRICE_*` (×4) | Mapping plans | bouton checkout désactivé |
| `ANTHROPIC_API_KEY` | Coach IA + Plan | fallback "local coach" texte basique |
| `RESEND_API_KEY` | Emails transactionnels | reset password silencieux |

### OPTIONNELLES (mais recommandées)

| Variable | Surface | Impact si absent |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | Rate-limit | endpoints sans rate-limit (fail-open documenté) |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Observabilité | pas de monitoring erreurs prod |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` | Social login UI | bouton Google masqué (intentionnel) |
| `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` | Social login UI | bouton Apple masqué (intentionnel) |
| `CRON_SECRET` | Cron weekly-recap | endpoint cron exposé sans bearer guard |

### Activation côté tiers (hors env vars)

- **Supabase Dashboard** → Auth → Providers → activer Google + Apple OAuth, ajouter `https://<NEXT_PUBLIC_APP_URL>/auth/callback` en redirect URL.
- **Supabase Dashboard** → SQL editor → exécuter les migrations `supabase/migrations/*.sql` (RLS policies + `apply_subscription_event` RPC).
- **Stripe Dashboard** → Webhooks → endpoint `https://<APP_URL>/api/stripe/webhook`, events : `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.
- **Stripe Dashboard** → Settings → Payment methods → activer cartes, Apple Pay, Google Pay, TWINT (CH).
- **Apple Developer** → Sign in with Apple Services ID + private key + team ID configurés dans Supabase.

---

## Ce qui est corrigé (S2 + S2-BIS)

### Sécurité

- ✅ **CSP réaliste** : `default-src 'self'`, whitelists Stripe / Supabase / Sentry / Vercel ; `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`.
- ✅ **HSTS** 2 ans avec preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy fermée (sauf `payment=(self "checkout.stripe.com")`).
- ✅ **COOP** `same-origin-allow-popups` pour social login.
- ✅ Webhook Stripe exclu du CSP (server-à-serveur).
- ✅ Rate-limit endpoints sensibles (`/api/stripe/*`, `/api/ai/chat`) via Upstash (fail-open documenté).
- ✅ UI throttle login/register/forgot (5 tentatives / 60s) en complément du rate-limit serveur.
- ✅ Errors Supabase mappées en 14 patterns i18n (jamais d'anglais brut au user).
- ✅ Open-redirect interdit : `safeRedirectPath` filtre les `next=` et `getAppBaseUrl()` est la seule source pour Stripe `success_url`/`return_url`.
- ✅ Auth callback : code → session via `exchangeCodeForSession`, fallback `/login?error=auth_callback` si échec.

### Paiement (Stripe)

- ✅ Webhook signature-verified + idempotence via table `stripe_events`.
- ✅ Race conditions évitées via RPC `apply_subscription_event` (Postgres `INSERT … ON CONFLICT … WHERE last_event_at < new`).
- ✅ Anti-abuse trial : flag `trial_used` empêche un second essai après cancel + nouveau checkout.
- ✅ Customer Stripe réutilisé entre checkouts (pas de ghost customers).
- ✅ Trial pause si moyen de paiement absent à J+14 (`trial_settings.end_behavior.missing_payment_method: "pause"`).
- ✅ API version pinnée `2024-12-18.acacia`, `invoiceSubscriptionId()` compatible pre-2024 + 2024+.

### Paywall

- ✅ Coach IA (`/api/ai/chat`) : `requirePremiumAccess` → 402.
- ✅ Plan generation (`createPlanAction`) : gate Anthropic.
- ✅ Memory editable (archive / clearAll) : gate write actions (toggle on/off reste libre = LPD/RGPD).
- ✅ Opportunities V3 : soft paywall component (shell sidebar + topbar préservés).
- ✅ Analytics détaillé `/expenses/analytics` : soft paywall.
- ✅ Demo (`data.isDemo`) reste ouverte pour preview de valeur.

### Auth

- ✅ Social login framework Google + Apple (UI conditionnelle sur env flags).
- ✅ Réinitialisation mot de passe : redirectTo `/auth/callback?next=/reset-password`.
- ✅ Erreurs localisées (i18n) sur les 4 formulaires auth.
- ✅ UI throttle anti double-clic + spam après échec.

### Mobile / PWA

- ✅ `app/manifest.ts` (PWA standalone, theme navy, catégories finance).
- ✅ `app/icon.tsx` (favicon dynamique Satori).
- ✅ `app/apple-icon.tsx` (180×180 pour "Add to Home Screen").
- ✅ `app/opengraph-image.tsx` (1200×630 dynamique).
- ✅ `appleWebApp` meta + `formatDetection` no-autolink dans `layout.tsx`.

### Tests

- ✅ `tests/unit/access-server.test.ts` : 11 tests sur la matrice Stripe status → AccessState.
- ✅ `tests/unit/client-throttle.test.ts` : 7 tests sur le throttle UI + dégradation gracieuse SSR / localStorage bloqué.
- ✅ `tests/unit/auth-error-messages.test.ts` : 17 tests sur le mapping i18n des erreurs Supabase.
- ✅ `tests/e2e/stripe-flows.spec.ts` : 6 tests boundary (auth, signature, body invalide) sur checkout / portal / webhook.

---

## Ce qui reste manuel (hors code)

1. **Stripe Dashboard** : configurer price IDs (×4) et webhook endpoint en preview puis prod.
2. **Supabase Dashboard** : activer providers OAuth + définir le redirect URL.
3. **Apple Developer Portal** : Sign in with Apple Services ID, JWT private key.
4. **Vercel** : configurer toutes les env vars listées ci-dessus.
5. **DNS** : pointer le custom domain vers Vercel + activer HTTPS managed.
6. **Privacy + ToS legal review** (FR + EN minimum) — les pages existent mais doivent être validées par juriste CH.
7. **Tests Stripe manuels** : trial complet, cancel mi-trial, resubscribe, payment_failed via stripe-cli.
8. **Lighthouse mobile** : viser ≥ 90 sur perf/a11y/PWA.

---

## P0 restants (bloqueurs vente publique)

1. **CSP nonce-strict** : la politique actuelle accepte `'unsafe-inline'` `'unsafe-eval'` sur `script-src` (Next.js RSC + framer-motion). Pour passer un security audit pro, exiger une migration nonce + désactivation framer-motion JIT. Effort : 1-2 jours, risque de régression visuelle.
2. **Tests Stripe live** : aucun test ne valide réellement un flux paiement complet (trial → active → cancel → resubscribe). Le webhook est unit-testé mais pas end-to-end avec stripe-cli. Effort : 1 jour avec stripe listen.
3. **Suppression de compte (RGPD/LPD)** : pas d'action `deleteAccountAction` exposée. Le user peut désactiver la mémoire mais pas demander l'effacement complet. Bloquant CH/EU.
4. **Apple Sign In en prod** : framework code prêt, mais activation Apple Developer non faite. Sans Apple SSO, App Store refusera l'app si Google SSO est offert.
5. **Email réception domaine vérifié** : Resend nécessite DKIM/SPF/DMARC sur le domaine d'envoi (`liberia.app` ou équivalent). Sans ça, taux de spam élevé.

## P1 (post-MVP commercial)

1. CSP report-uri vers Sentry pour monitorer les violations.
2. Suppression hard delete des conversations + données IA (purge cron + UI).
3. 2FA TOTP (Supabase MFA, hors social login).
4. Export RGPD complet (CSV + JSON de toutes les tables user).
5. Stripe Tax automatic (TVA CH auto).
6. Webhook retry observability (Sentry breadcrumbs sur retry > 3).
7. CSP nonce migration (cf. P0 #1).
8. Lighthouse 95+ + Real User Monitoring.

---

## Note /1000

**740 / 1000**

- Stripe rails : 95/100 (idempotence + race-free + anti-abuse)
- Sécurité headers : 75/100 (CSP réaliste, pas strict)
- Sécurité auth : 80/100 (rate-limit + i18n + throttle, manque 2FA + suppression compte)
- Paywall : 80/100 (5 surfaces gatées, manque granularité par feature)
- Mobile / PWA : 75/100 (manifest + icons OK, manque service worker + Lighthouse audit)
- Tests : 75/100 (1031 unit ✓, Stripe boundary e2e ✓, manque Stripe live)
- Légal : 50/100 (pages existent, review juriste KO, RGPD delete account manquant)
- Observabilité : 60/100 (Sentry SDK câblé, manque dashboards + alerting)

---

## Verdict honnête

### **NON — pas vendable à un inconnu demain matin.**

**Pourquoi NON :**

1. **Pas de suppression de compte RGPD/LPD** = exposition légale CH/EU dès la première vente.
2. **CSP `'unsafe-inline'` `'unsafe-eval'`** = un security review pro flaggera en pre-sale.
3. **Pas de test live d'un cycle trial→active→cancel** = on n'a JAMAIS vérifié end-to-end que l'argent rentre et que la résiliation fonctionne.
4. **Pas d'Apple Sign In activé** = App Store refusera si Google SSO est offert.
5. **Resend domain pas vérifié** = emails reset password en spam → support tickets dès J+1.

**Mais :** le rail Stripe + Supabase + middleware + paywall + i18n est suffisamment solide pour vendre à un **early-adopter accompagné** (1-1, demo, on-boarding manuel) sous **48 h** d'effort focalisé sur les 5 P0 ci-dessus.

**Estimation pour OUI honnête :** 3-5 jours de travail dédié.
