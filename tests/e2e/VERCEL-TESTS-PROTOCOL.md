# Protocole tests réels Vercel preview

Ce document décrit comment exécuter les tests E2E **réels** qui
nécessitent un environnement complet (Supabase + Anthropic + Stripe).

Ces tests ne s'exécutent pas en CI locale (auto-skipped si les
variables d'environnement requises sont absentes).

## Prérequis

### 1. Vercel preview deployment
Déployer une PR sur Vercel preview avec toutes les variables d'env
configurées :
- `STRIPE_SECRET_KEY` (test mode `sk_test_…`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_…`)
- `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY` (price_…)
- `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY`
- `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY`
- `ANTHROPIC_API_KEY` (sk-ant-…)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (= URL preview)

### 2. Utilisateur de test pré-créé
Créer un compte test dans Supabase Auth :
- Email : `test+e2e@liberia.app`
- Password : `<un mot de passe fort>`
- Profil complété (onboarding fait)

### 3. Stripe Customer Portal configuré
Dans Stripe Dashboard test mode :
- Settings → Customer portal → Activate
- Allow : update subscription, cancel subscription, update payment method

## Variables d'environnement pour Playwright

```bash
export PLAYWRIGHT_BASE_URL="https://liberia-pr-xxx.vercel.app"
export E2E_USER_EMAIL="test+e2e@liberia.app"
export E2E_USER_PASSWORD="<password>"
export E2E_STRIPE_CARD="4242424242424242"
```

## Commandes

### Lancer tous les tests réels Vercel
```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
PW_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
npx playwright test tests/e2e/vercel-real.spec.ts --project=chromium
```

### Lancer uniquement Coach IA
```bash
npx playwright test tests/e2e/vercel-real.spec.ts --grep "Coach IA"
```

### Lancer uniquement Stripe
```bash
npx playwright test tests/e2e/vercel-real.spec.ts --grep "Stripe"
```

### Lancer en mode UI (debug)
```bash
npx playwright test tests/e2e/vercel-real.spec.ts --ui
```

## Scénarios couverts (auto)

| Scénario | Test ID | Couvert par |
|---|---|---|
| Envoi message Coach IA + streaming SSE | `Coach IA > envoyer un message` | textarea fill + Enter, attendre bulle user + reply |
| Shift+Enter newline | `Coach IA > Shift+Enter` | inputValue contient `\n` |
| Persistance après reload | `Coach IA > reload preserves messages` | reload + assertion message visible |
| Stripe checkout test card 4242 | `Stripe > checkout` | fill cardNumber + expiry + cvc, retour ?status=success |
| Stripe portal | `Stripe > portal` | popup billing.stripe.com |
| Ajout revenu → reflux Dashboard/Coach | `Propagation > revenu` | montant aléatoire vérifié sur 2 pages |
| Modif profil → Topbar | `Profil > prénom` | greeting reflète le nouveau prénom |

## Scénarios à tester MANUELLEMENT (non automatisables)

### Webhook Stripe
```bash
# Terminal 1 : Stripe CLI
stripe listen --forward-to https://liberia-pr-xxx.vercel.app/api/stripe/webhook

# Terminal 2 : trigger event
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

Vérifier dans Supabase que `subscriptions` table reflète chaque
événement (status, current_period_end, cancel_at_period_end).

### Mode démo
- `/demo` doit s'afficher correctement sans auth
- Tous les chiffres demo cohérents entre pages

### Sécurité RLS
- Connecté avec user A, taper l'URL d'une ressource user B
- Doit retourner 404 / null / vide (jamais leak data)

### Mobile réel (iPhone)
- Tester sur device réel iPhone 14 Pro Max
- Vérifier :
  - Hamburger sous l'encoche, non chevauché
  - Composer Coach IA : tap → pas de zoom iOS
  - Stripe checkout : carte 4242 sur Safari iOS
  - Apple Pay / TWINT si activé Dashboard Stripe

### Réseau dégradé
- Throttling Slow 3G Chrome DevTools
- Coach IA doit afficher TypingIndicator + ne pas crasher

## Critères d'acceptation BÊTA

✅ Tous les tests `vercel-real.spec.ts` passent en preview
✅ Webhook test manuel : 5 events successivement reflétés en DB
✅ Mobile réel iPhone : aucun bug visible
✅ RLS test : 0 leak entre users
✅ Coach IA : 10 conversations enchaînées sans erreur
