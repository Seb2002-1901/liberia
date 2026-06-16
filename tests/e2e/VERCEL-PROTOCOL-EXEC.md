# Protocole Vercel preview — exécution complète

Document opérationnel pour valider LIBERIA en conditions réelles
avant bêta privée. Suit cet ordre **strict** : préparation → déploi →
config env → tests auto → tests manuels → critère go/no-go.

**Durée estimée totale : 2-3 h** (1 h config + 1 h tests auto + 1-2 h
manuels).

---

## 🔧 Phase 0 — Prérequis (une seule fois)

### 0.1 Outils CLI

```bash
# Vercel CLI
npm i -g vercel
vercel --version  # >= 32

# Stripe CLI (pour webhook test)
# macOS
brew install stripe/stripe-cli/stripe
# Linux
curl -fsSL https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

stripe --version  # >= 1.19

# Playwright (déjà dans le repo)
cd ~/liberia
npx playwright --version  # 1.60
```

### 0.2 Login CLI

```bash
# Vercel
vercel login
# choisis ton compte

# Stripe (test mode)
stripe login
# ouvre browser, valide
```

### 0.3 Compte Supabase test pré-créé

Dans Supabase Dashboard → Authentication → Users :

```
Email    : test+e2e@liberia.app
Password : ChooseAStrongOne!
Confirm  : ✓ (auto-confirm pour skip email verif)
```

Puis dans le SQL editor, valider l'onboarding :

```sql
INSERT INTO profiles (id, email, full_name, onboarding_completed, currency, locale, country)
VALUES (
  (SELECT id FROM auth.users WHERE email='test+e2e@liberia.app'),
  'test+e2e@liberia.app',
  'Test E2E',
  true,
  'CHF',
  'fr-CH',
  'CH'
)
ON CONFLICT (id) DO UPDATE SET onboarding_completed = true;

-- Profil financier minimal
INSERT INTO financial_profiles (user_id, situation, monthly_income, monthly_expenses, current_savings)
VALUES (
  (SELECT id FROM auth.users WHERE email='test+e2e@liberia.app'),
  'stable',
  6000,
  4500,
  3000
)
ON CONFLICT (user_id) DO UPDATE SET monthly_income=6000;
```

### 0.4 Stripe Customer Portal activé

Stripe Dashboard → **Settings** → **Customer portal** :
- Activate the portal
- Subscriptions: ✓ Allow customers to update / cancel
- Payment methods: ✓ Allow updates
- Cancellation reason: optional

### 0.5 Stripe Products + Prices créés

Dashboard → **Products** :

| Product | Price 1 (monthly) | Price 2 (yearly) |
|---|---|---|
| LIBERIA Standard | 14,95 CHF/mois | 149 CHF/an |
| LIBERIA Premium | 19,95 CHF/mois | 199 CHF/an |

Copier les 4 `price_xxx` IDs pour les env vars plus bas.

---

## 🚀 Phase 1 — Déploiement Vercel preview

### 1.1 Push branche

```bash
cd ~/liberia
git checkout claude/phase-5-sprint-3.1-dashboard-polish
git push origin claude/phase-5-sprint-3.1-dashboard-polish
```

### 1.2 Lier le projet Vercel (1ère fois uniquement)

```bash
vercel link
# Choisir l'équipe / projet existant
```

### 1.3 Déployer en preview

```bash
vercel deploy --prod=false
# Note l'URL preview retournée, ex :
# https://liberia-xxx-yourname.vercel.app
```

OU déployer via GitHub auto (si configuré) : le push branch suffit, Vercel preview se construit automatiquement (~ 2-3 min).

```bash
# Récupère l'URL preview
export PREVIEW_URL="https://liberia-xxx-yourname.vercel.app"
echo $PREVIEW_URL
```

---

## ⚙️ Phase 2 — Variables d'environnement Vercel

### 2.1 Via Dashboard Vercel (recommandé)

Vercel Dashboard → projet `liberia` → Settings → **Environment Variables** :

Scope : **Preview** (ou All Environments pour ce test)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL              = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY         = eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY             = eyJhbGciOiJIUzI1NiIs...

# App URL — CRITIQUE pour Stripe redirect strict
NEXT_PUBLIC_APP_URL                   = https://liberia-xxx-yourname.vercel.app

# Stripe TEST mode
STRIPE_SECRET_KEY                     = sk_test_xxx
STRIPE_WEBHOOK_SECRET                 = whsec_xxx  (généré phase 3)
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY = price_xxx
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY  = price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY  = price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY   = price_xxx

# Anthropic
ANTHROPIC_API_KEY                     = sk-ant-xxx

# Upstash rate-limit (optionnel mais recommandé)
UPSTASH_REDIS_REST_URL                = https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN              = AYxxx
```

### 2.2 Redéployer pour activer les nouvelles vars

```bash
vercel deploy --prod=false --force
# Note la NOUVELLE URL preview (vars d'env appliquées)
export PREVIEW_URL="https://liberia-yyy-yourname.vercel.app"
```

### 2.3 Smoke check

```bash
curl -I $PREVIEW_URL
# Doit retourner HTTP/2 200 ou 308 (redirect /)
```

---

## 🔗 Phase 3 — Webhook Stripe (terminal séparé)

### 3.1 Démarrer le forwarding

```bash
# Terminal 1 (laisse tourner pendant tout le test)
stripe listen \
  --forward-to $PREVIEW_URL/api/stripe/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
```

La sortie affiche :
```
Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

**Copier ce `whsec_xxx`** → Vercel Dashboard → env var `STRIPE_WEBHOOK_SECRET` → redéployer si différent.

### 3.2 Test trigger manuel

```bash
# Terminal 2
stripe trigger checkout.session.completed
# Devrait apparaître dans Terminal 1 + dans Vercel logs
```

---

## 🤖 Phase 4 — Tests Playwright automatisés

### 4.1 Variables locales pour Playwright

```bash
cd ~/liberia
export PLAYWRIGHT_BASE_URL="$PREVIEW_URL"
export E2E_USER_EMAIL="test+e2e@liberia.app"
export E2E_USER_PASSWORD="ChooseAStrongOne!"
export E2E_STRIPE_CARD="4242424242424242"
export PLAYWRIGHT_BROWSERS_PATH="/opt/pw-browsers"
export PW_CHROME_PATH="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
```

### 4.2 Lancer dans l'ordre

**Ordre obligatoire** (chaque test prépare le suivant) :

```bash
# Test 1 — Coach IA envoi message (crée la conversation)
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Coach IA > envoyer" \
  --reporter=list
# Attendu : passed, URL termine par /coach/{uuid}, message persistant

# Test 2 — Shift+Enter newline
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Coach IA > Shift" \
  --reporter=list
# Attendu : passed, inputValue contient \n

# Test 3 — Stripe checkout (crée la subscription trial)
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Stripe > checkout" \
  --reporter=list
# Attendu : passed, ?status=success, banner trial visible
# Vérifier Terminal 1 (Stripe CLI) : webhook checkout.session.completed reçu

# Test 4 — Stripe portal
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Stripe > portal" \
  --reporter=list
# Attendu : passed, popup billing.stripe.com

# Test 5 — Propagation revenu
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Propagation > revenu" \
  --reporter=list
# Attendu : passed, montant aléatoire affiché sur Dashboard + Coach

# Test 6 — Profil → Topbar
npx playwright test tests/e2e/vercel-real.spec.ts \
  --project=chromium \
  --grep "Profil > prénom" \
  --reporter=list
# Attendu : passed, greeting reflète le nouveau prénom
```

### 4.3 Run all-in-one (si les 6 passent un à un)

```bash
npx playwright test tests/e2e/vercel-real.spec.ts --project=chromium --reporter=list
# Attendu : 6 passed (durée ~ 3-5 min selon réseau)
```

### 4.4 Capture trace en cas d'échec

```bash
npx playwright test tests/e2e/vercel-real.spec.ts --project=chromium --trace on
# Trace HTML générée dans test-results/ — ouvre avec :
npx playwright show-trace test-results/<dossier>/trace.zip
```

---

## 🔥 Phase 5 — Webhook Stripe manuels

Dans **Terminal 2** (Terminal 1 garde `stripe listen` actif) :

```bash
# 1. Création subscription (déjà déclenché par checkout)
stripe trigger customer.subscription.created
# Vérifier DB Supabase : SELECT * FROM subscriptions WHERE user_id=...
# status doit être 'trialing'

# 2. Update subscription
stripe trigger customer.subscription.updated
# Vérifier : status / current_period_end mis à jour

# 3. Trial will end (3 jours avant)
stripe trigger customer.subscription.trial_will_end
# Pas géré côté webhook — vérifier emails Stripe

# 4. Invoice paid (trial → active)
stripe trigger invoice.paid
# Vérifier : status = 'active'

# 5. Payment failed
stripe trigger invoice.payment_failed
# Vérifier : status = 'past_due'

# 6. Subscription deleted (cancel)
stripe trigger customer.subscription.deleted
# Vérifier : status = 'canceled', cancel_at_period_end = true
```

Pour chaque trigger, vérifier dans Vercel Logs (Vercel Dashboard → Logs) :
- `POST /api/stripe/webhook` → 200
- Idempotence : si replay même event → `deduped: true`

---

## 📱 Phase 6 — Test manuel iPhone réel

Sur **iPhone physique** (iPhone 14 / Pro / SE 2+) :

### 6.1 Login flow

1. Safari iOS → `$PREVIEW_URL`
2. Click "Se connecter" → /login
3. Saisir `test+e2e@liberia.app` + password
4. **Vérifier** : pas de zoom au focus input (font-size 16 px ✓)
5. Submit → redirige vers /design-match/dashboard-v3
6. **Vérifier** : aucun débord horizontal, topbar lisible "Bonjour Test 👋"

### 6.2 Navigation Coach IA

7. Click sidebar mobile (hamburger top-left)
8. **Vérifier** : drawer s'ouvre PLEINE HAUTEUR (pas coupé par URL bar)
9. Click "Coach IA" → auto-redirect vers /coach/{uuid} (créée plus tôt)
10. **Vérifier** : Hero "Coach IA Liberia · Premium · En ligne" + RightRail visible (320 px → caché < 768 ✓)
11. Tap composer textarea → **PAS de zoom Safari** ✓
12. Tape "Hello coach"
13. Tap "Envoyer" → bulle navy apparaît immédiatement
14. **Vérifier** : streaming arrive, bulle assistant V3 (avatar navy Sparkles + bulle #F4F6FB)
15. Tap "Précédente" ou Coach IA depuis hamburger
16. **Vérifier** : retour fluide, scroll OK

### 6.3 Abonnement

17. Hamburger → carte "Gérer mon abonnement" → /settings/subscription
18. Click "Premium mensuel — Commencer l'essai"
19. Stripe checkout iOS : remplir 4242 / 12/30 / 123
20. Submit → retour `/settings/subscription?status=success`
21. **Vérifier** : toast success + bannière "Période d'essai"

### 6.4 Logout / reconnect

22. Profil → Déconnexion
23. **Vérifier** : retour `/` ou /login
24. Re-login → données préservées (revenu test E2E visible)

### 6.5 Réseau dégradé

25. Safari iOS → Settings → Developer (si Mac mate connecté)
26. Throttle 3G
27. Coach IA → envoyer message → TypingIndicator visible, pas de crash

---

## 🛡️ Phase 7 — Test RLS sécurité (manuel)

Créer un **deuxième** user test (`test2+e2e@liberia.app`), créer 1 conversation, copier son `conversation_id`.

Puis :
- Login user A (test+e2e)
- Taper URL `$PREVIEW_URL/coach/<conv-id-de-B>`
- **Attendu** : 404 (notFound) — JAMAIS le contenu de la conv B

Idem pour `/api/...` directs :
```bash
curl -i $PREVIEW_URL/api/ai/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<conv-id-de-B>","content":"hack"}'
# Attendu : 401 ou 403 (RLS bloque)
```

---

## ✅ Critère go/no-go BÊTA

### Pour passer en BÊTA PRIVÉE 5 testeurs

| Item | Méthode | Critère |
|---|---|---|
| Phase 4 — 6 tests Playwright | auto | **6/6 passed** |
| Phase 5 — 6 events Stripe | manuel | **6/6 reflétés DB** |
| Phase 6 — iPhone réel | manuel | **25/25 étapes OK** |
| Phase 7 — RLS | manuel | **0 leak entre users** |

**Si TOUS verts → 100 / 100 → 🚀 GO BÊTA.**

**Si UN SEUL P0** :
- Stripe checkout casse → BLOCANT
- Coach IA n'envoie pas → BLOCANT
- iPhone Safari zoom au focus → BLOCANT
- RLS leak → BLOCANT CRITIQUE
- Webhook 5xx → BLOCANT

→ Corriger avant relance protocole.

---

## 📋 Commandes — copy/paste rapide

### Setup une seule fois

```bash
# Login Vercel + Stripe
vercel login
stripe login

# Compte test Supabase (via SQL editor)
# voir Phase 0.3
```

### Cycle complet (à chaque test)

```bash
# 1. Push + déployer
git push origin claude/phase-5-sprint-3.1-dashboard-polish
vercel deploy --prod=false
export PREVIEW_URL="<url retournée>"

# 2. Stripe listen (terminal 1, laisser tourner)
stripe listen --forward-to $PREVIEW_URL/api/stripe/webhook

# 3. Playwright (terminal 2)
cd ~/liberia
export PLAYWRIGHT_BASE_URL="$PREVIEW_URL"
export E2E_USER_EMAIL="test+e2e@liberia.app"
export E2E_USER_PASSWORD="<password>"
export E2E_STRIPE_CARD="4242424242424242"
export PLAYWRIGHT_BROWSERS_PATH="/opt/pw-browsers"
export PW_CHROME_PATH="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

npx playwright test tests/e2e/vercel-real.spec.ts --project=chromium --reporter=list

# 4. Stripe triggers (terminal 2)
for ev in customer.subscription.created customer.subscription.updated customer.subscription.deleted invoice.paid invoice.payment_failed; do
  stripe trigger $ev
  sleep 2
done

# 5. iPhone réel
# voir Phase 6 manuel

# 6. RLS check
# voir Phase 7 manuel
```

---

## ⏱️ Estimation totale

| Phase | Durée |
|---|---|
| Phase 0 prérequis | 30 min (1 fois) |
| Phase 1 deploy | 5 min |
| Phase 2 env vars | 10 min |
| Phase 3 webhook | 5 min |
| Phase 4 Playwright | 10 min |
| Phase 5 webhooks manuels | 15 min |
| Phase 6 iPhone réel | 30 min |
| Phase 7 RLS | 10 min |
| **TOTAL** | **~ 2 h** |

---

## 🆘 En cas de problème

- **Vercel build échoue** → vérifier env vars présentes (Settings → Env Vars)
- **Stripe webhook 401** → `STRIPE_WEBHOOK_SECRET` mismatch, copier le frais du `stripe listen`
- **Playwright timeout** → augmenter `--timeout=60000` ; vérifier que Vercel preview répond (cold start ?)
- **Auth failed** → vérifier user existe + onboarding_completed=true en DB
- **Coach IA 501** → `ANTHROPIC_API_KEY` manquant ou invalide
- **Mobile zoom au focus** → vérifier que la version déployée contient bien le commit avec font-size:16px (globals.css)

---

## 📝 Document de retour bêta

Après le test, créer `tests/e2e/VERCEL-RESULTS-<date>.md` avec :

```markdown
# Résultats Vercel preview — YYYY-MM-DD

Tester : <nom>
URL preview : <PREVIEW_URL>
Branch : claude/phase-5-sprint-3.1-dashboard-polish

## Phase 4 — Playwright auto
- [ ] Coach IA envoyer : PASS / FAIL — details
- [ ] Shift+Enter : PASS / FAIL
- [ ] Stripe checkout : PASS / FAIL
- [ ] Stripe portal : PASS / FAIL
- [ ] Propagation revenu : PASS / FAIL
- [ ] Profil → Topbar : PASS / FAIL

## Phase 5 — Webhooks
- [ ] subscription.created
- [ ] subscription.updated
- [ ] subscription.deleted
- [ ] invoice.paid
- [ ] invoice.payment_failed

## Phase 6 — iPhone
- [ ] Login sans zoom
- [ ] Dashboard pas de débord
- [ ] Coach composer accessible
- [ ] Stripe checkout iOS
- [ ] Drawer plein écran

## Phase 7 — RLS
- [ ] User A ne voit pas conv user B
- [ ] /api/ai/chat refuse conv user B

## Verdict
[ ] 🚀 GO BÊTA
[ ] ⛔ NO-GO — bugs trouvés : ...
```
