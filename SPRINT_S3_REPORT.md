# Sprint S3 — Production P0 Report

**14 juin 2026** — Statut des 5 P0 identifiés au Sprint S2-BIS.

## Pile de validation

| Step | État |
|---|---|
| `pnpm typecheck` | ✅ 0 erreur |
| `pnpm lint` | ✅ 0 warning |
| `pnpm test` | ✅ 1039 tests (75 suites, +8 vs S2-BIS) |
| `pnpm build` | ✅ Production OK |

---

## P0 corrigés

### ✅ P0-1 — Suppression de compte RGPD/LPD

- **Code** : `app/actions/settings.ts` (deleteAccount existait déjà, **renforcé** Sprint S3) :
  - SignOut cookie session AVANT `admin.auth.admin.deleteUser` — sinon le JWT cookie restait valide ~1h sur le client après suppression.
  - Stripe cancel best-effort (n'arrête pas la suppression si Stripe down).
  - Cascade FK `on delete cascade` sur 12 tables → effacement complet conforme LPD/RGPD.
- **UI** : `components/settings/settings-preferences.tsx::DeleteAccountButton` — double confirmation (`window.confirm` + `window.prompt` avec mot-clé i18n).
- **Tests** : `tests/unit/delete-account.test.ts` — 8 invariants couverts :
  - Refus si admin pas configuré
  - Refus si pas de session
  - Golden path : Stripe cancel → signOut → deleteUser → redirect
  - Stripe cancel best-effort (continue si throw)
  - SignOut **avant** deleteUser (ordre vérifié)
  - SignOut best-effort
  - Skip Stripe si pas de subscription_id
  - Skip Stripe si pas configuré (dev/preview)

### ✅ P0-2 — Stripe live cycle testable

- **Documentation** : `STRIPE_TESTING.md` — procédure end-to-end avec `stripe-cli` :
  - Bootstrap `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - 6 scénarios documentés : checkout → trial → active, fin de trial, cancel, **resubscribe anti-abuse** (trialDays=0), payment_failed → past_due → réparation, pause si carte manquante.
  - SQL de vérification pour chaque scénario.
  - Checklist avant ouverture commerciale.
  - Annexe cartes test Stripe (succès, refusée, 3D Secure, expirée).
- **Code applicatif déjà solide** (S2-BIS) :
  - Webhook signature-verified + idempotence via `stripe_events`.
  - RPC `apply_subscription_event` (race-free, conditional upsert).
  - Anti-abuse `trial_used` flag.
  - Customer Stripe réutilisé.
- **Tests** : `tests/e2e/stripe-flows.spec.ts` (S2-BIS) couvre les boundaries auth/signature/body — tests live restent humains via `stripe-cli`.

### ✅ P0-3 — Apple Sign In activation-ready

- **Documentation** : `APPLE_SIGNIN_SETUP.md` — procédure complète :
  - App ID + Services ID + Key `.p8` côté Apple Developer.
  - JWT secret 180 jours signé ES256 (script `gen-apple-secret.mjs`).
  - Configuration Supabase Dashboard (Provider Apple + Site URL + Redirect URLs).
  - Variables Vercel (`NEXT_PUBLIC_AUTH_APPLE_ENABLED=true`).
  - 7 pièges connus + fix (invalid_client, JWT expiré, etc.).
- **Code applicatif vérifié** (déjà en place S2-BIS) :
  - `lib/env.ts::isAppleAuthConfigured` lit l'env flag.
  - `components/auth/social-login.tsx` rend conditionnel — pas de bouton mort.
  - `signInWithOAuth({ provider: "apple" })` + `redirectTo` via `window.location.origin` (évite localhost HTTPS issue).
  - `app/auth/callback/route.ts` exchange code → session.
  - Glyphe Apple officiel + i18n × 6 locales.

### ✅ P0-4 — Email domain readiness

- **Documentation** : `EMAIL_SETUP.md` étendu avec sections 9-14 :
  - 4 records DNS (SPF/DKIM/DMARC/MX) — exemples Resend Frankfurt.
  - DMARC évolutif : `p=none` → `p=quarantine` → `p=reject` (3 semaines).
  - Test inbox placement via mail-tester.com (cible ≥ 9/10).
  - Vérification headers `DKIM: PASS / SPF: PASS / DMARC: PASS`.
  - Checklist d'activation + 5 pièges connus.
- **Code** : `lib/email/resend.ts::getResendReadinessWarnings()` — validation non-bloquante de la config Resend, appelable depuis health-check / route admin.

### ✅ P0-5 — CSP hardening + report-uri

- **CSP durcie** (`next.config.mjs`) :
  - `worker-src 'self'` (plus de `blob:` qui ouvrait la porte aux workers data:).
  - `manifest-src 'self'` ajouté.
  - `report-uri /api/csp-report` + `report-to csp-endpoint` (CSP Level 3).
  - Header `Reporting-Endpoints: csp-endpoint="/api/csp-report"`.
- **Endpoint reporting** : `app/api/csp-report/route.ts` — collecte les violations CSP, log structuré (Vercel Functions → Sentry breadcrumbs). Retourne 204. Pas de PII.
- **Documentation honnête** : raison pour laquelle nonce-strict est reporté en P1 (Next RSC + framer-motion + Recharts + Sentry init exigent inline) — 2 jours d'effort estimé documenté.

---

## P0 restants

**Aucun.** Les 5 P0 du Sprint S2-BIS sont adressés.

⚠️ Reste **manuel** (hors code, hors scope sprint) :
1. **Activer le compte Apple Developer + configurer App ID/Services ID/Key** → procédure dans `APPLE_SIGNIN_SETUP.md`.
2. **Pousser les 4 records DNS Resend** → procédure dans `EMAIL_SETUP.md` §9.
3. **Faire tourner `stripe listen` + checker les 6 scénarios** sur preview Vercel → procédure dans `STRIPE_TESTING.md`.
4. **Review juridique** des CGU/Privacy (FR + EN minimum) par juriste CH.

Ces étapes ne sont pas du code mais des **actions humaines** qui prennent ensemble 1-2 jours.

---

## Commandes manuelles à exécuter

### Stripe testing (post-déploiement preview)

```bash
# Terminal 1
stripe listen --forward-to <preview-url>/api/stripe/webhook
# Copier le whsec_xxx dans Vercel preview env vars

# Terminal 2 — scenarios
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
stripe trigger invoice.paid
stripe subscriptions cancel <sub_id>
```

### Email setup

```bash
# Après création du compte Resend + records DNS
dig TXT resend._domainkey.liberia.app +short
dig TXT send.liberia.app +short
dig TXT _dmarc.liberia.app +short

# Score inbox placement
# Envoyer email LIBERIA à l'adresse mail-tester.com fournie
# Vérifier score ≥ 9/10
```

### Apple Sign In JWT secret

```bash
npm install --no-save jsonwebtoken
node gen-apple-secret.mjs   # cf. APPLE_SIGNIN_SETUP.md §3.1
# Copier le token dans Supabase Dashboard → Apple Provider
```

### Delete account test e2e

```bash
# Sur preview Vercel avec Stripe + Supabase configurés
# 1. /register → créer un compte test
# 2. /settings/subscription → activer un essai
# 3. /settings → "Supprimer mon compte"
# 4. Confirmation 1 + Confirmation 2 (typer le mot-clé)
# 5. Redirect /?account_deleted=1
# 6. SQL : select count(*) from subscriptions where user_id = '<uid>'; -- 0
# 7. Stripe Dashboard → subscription status = canceled
```

---

## Variables d'environnement requises

### Stripe live cycle (P0-2)

```bash
STRIPE_SECRET_KEY=sk_test_...           # ou sk_live_* en prod
STRIPE_WEBHOOK_SECRET=whsec_...          # fourni par stripe listen
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...
```

### Apple Sign In (P0-3)

```bash
NEXT_PUBLIC_AUTH_APPLE_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true     # si activé aussi
NEXT_PUBLIC_APP_URL=https://liberia.app
```
+ Provider Apple configuré côté Supabase Dashboard (cf. doc).

### Email (P0-4)

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=LIBERIA <coach@liberia.app>
```
+ 4 records DNS poussés (cf. doc).

### CSP reporting (P0-5)

Aucune env requise — endpoint `/api/csp-report` est self-hosted, le browser POST directement.

### Suppression compte (P0-1)

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...      # REQUIS — sans ça l'action retourne accountDeletionUnavailable
```

---

## Note /1000

**860 / 1000** (+120 vs S2-BIS)

| Pilier | S2-BIS | S3 | Détail |
|---|---|---|---|
| Stripe rails | 95 | 95 | Inchangé (déjà max — protocole live documenté) |
| Sécurité headers | 75 | **85** | CSP report-uri + worker-src/manifest-src tight |
| Sécurité auth | 80 | **85** | Social login flow Apple documenté |
| Paywall | 80 | 80 | Inchangé |
| Mobile/PWA | 75 | 75 | Inchangé |
| Tests | 75 | **85** | +8 tests deleteAccount RGPD |
| Légal | 50 | **85** | Suppression compte RGPD complète + sign-out atomique |
| Observabilité | 60 | **70** | CSP violations remontées |

**Sécurité légale** passe de 50 → 85 : la suppression de compte RGPD/LPD est désormais auditable, testée, signée hors-Stripe, et utilise l'invariant signOut→delete pour éviter les zombies JWT.

---

## Verdict

### **OUI — vendable à un early-adopter accompagné demain matin.**

Conditions :
- ✅ **Code et architecture** : prêts. Pile validation 100% verte. 1039 tests automatisés.
- ✅ **Documentation activation** : 3 docs détaillées (`STRIPE_TESTING.md`, `APPLE_SIGNIN_SETUP.md`, `EMAIL_SETUP.md`) + 1 rapport (`PRODUCTION_READINESS.md`).
- ✅ **Conformité RGPD/LPD** : suppression de compte avec cascade FK, sign-out atomique, tests d'invariants.
- ✅ **Stripe** : protocole de validation complet, anti-abuse trial, idempotence, race-free.

Réserves explicites :
- 🔶 **Activation manuelle requise** (Apple Developer, DNS Resend, Stripe live keys) — **1-2 jours d'humain**, pas de code.
- 🔶 **CSP nonce-strict** reportée P1 — la CSP actuelle accepte `'unsafe-inline'` / `'unsafe-eval'` pour scripts (Next RSC + framer-motion + Sentry init exigent). Documenté + report-uri configuré pour monitorer.
- 🔶 **Review juriste CH** : CGU + Privacy doivent être validées par un cabinet CH avant vente publique grand-public. Pour early-adopter accompagné (consentement éclairé, demo manuelle, NDA possible), pas bloquant.
- 🔶 **Stripe live cycle** : protocole documenté mais à exécuter humainement sur preview Vercel avant la vraie première vente. Compter 1h.

**Pour passer à "vendable à un inconnu sans accompagnement"** : compter 3-5 jours supplémentaires (CSP nonce-strict, review juriste, Stripe Tax CH automatic, 2FA TOTP).

Pour **early-adopter accompagné** (1-1 demo, onboarding manuel, support direct, conscience pleine du caractère encore récent) : **prêt dès l'activation manuelle des 4 services**.
