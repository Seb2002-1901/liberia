# LIBERIA — Protocole de Lancement

**Sprint S3 fermé** — Code production-ready validé. Ce document trace l'exécution
réelle pour passer de "vendable early-adopter accompagné" à "vendable publiquement".

Aucune nouvelle feature, aucune refonte. Seulement activation, tests réels, décision.

---

## Vue d'ensemble

| Phase | Objectif | Durée estimée | Acteur principal |
|---|---|---|---|
| Phase 1 | Activer les 4 services externes | 1 jour ouvré | Toi (+ Claude si bug) |
| Phase 2 | Tester end-to-end un cycle utilisateur réel | 1 demi-journée | Toi |
| Phase 3 | Décision GO / NO-GO publique | 1-2 h | Toi (+ juriste si besoin) |

**Budget total réaliste** : 2 jours ouvrés pour passer en vente publique limitée.
3-5 jours pour vente publique grand public (review juriste + CSP nonce-strict).

---

## Phase 1 — Activation services externes

### 1.1 Stripe — Mode Test puis Live (≈ 2-3 h)

**État actuel** : code prêt (`STRIPE_TESTING.md` couvre tout), zéro clé configurée.

**Étapes**:

- [ ] **Compte Stripe** créé sur stripe.com (CH si possible, sinon n'importe quel pays — la TVA suisse se gère plus tard).
- [ ] Dashboard Stripe → **Test mode** activé (toggle en haut à droite).
- [ ] Dashboard → **Products** → créer 4 prix :
  - Standard mensuel : 14.95 CHF/mois, récurrent mensuel
  - Standard annuel : 149.00 CHF/an, récurrent annuel
  - Premium mensuel : 19.95 CHF/mois
  - Premium annuel : 199.00 CHF/an
  - Noter les 4 `price_xxxxxxx`.
- [ ] Dashboard → **Settings → Payment methods** → activer :
  - ✅ Cartes
  - ✅ Apple Pay
  - ✅ Google Pay
  - ✅ TWINT (essentiel marché CH)
- [ ] Installer `stripe-cli` localement :
  ```
  brew install stripe/stripe-cli/stripe  # macOS
  stripe login
  ```
- [ ] Vercel → ton projet → **Settings → Environment Variables** → ajouter (en Preview + Production) :
  ```
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_...
  NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY=price_...
  NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_...
  NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_...
  ```
- [ ] Redéployer preview Vercel.
- [ ] Terminal local :
  ```
  stripe listen --forward-to <preview-url>/api/stripe/webhook
  ```
- [ ] Copier le `whsec_xxx` affiché → Vercel env vars → `STRIPE_WEBHOOK_SECRET` → redéployer.
- [ ] Tester les **6 scénarios** de `STRIPE_TESTING.md §2` un par un :
  1. ✅ Checkout → `status=trialing` en DB
  2. ✅ Fin de trial → `status=active`
  3. ✅ Cancel mi-trial → `status=canceled` ou `cancel_at_period_end=true`
  4. ✅ Resubscribe → console log `trialDays = 0` (anti-abuse)
  5. ✅ `payment_failed` → `status=past_due`
  6. ✅ Carte manquante en fin de trial → `status=paused`

**Critère succès phase 1.1** : les 6 SQL de vérification retournent les valeurs attendues.

**Si KO** : noter le scénario qui rate + screenshot Stripe Dashboard webhooks + appeler Claude.

#### Passage en Live (à faire UNIQUEMENT après Phase 2 verte)

- [ ] Dashboard Stripe → **Activate account** (KYC) — exige vraies infos business (raison sociale, IBAN, RC suisse si applicable).
- [ ] Recréer les 4 prix en mode **Live** (les `price_xxx` test ne marchent pas en live).
- [ ] Webhook **Live** : Dashboard → Webhooks → Add endpoint → URL prod (pas preview) → 6 events (`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`).
- [ ] Vercel **Production** env : remplacer `sk_test_*` par `sk_live_*` + `whsec_*` live + nouveaux `price_*` live.

---

### 1.2 Resend — Domaine email (≈ 1-2 h + 1-15 min propagation DNS)

**État actuel** : code prêt, env `RESEND_API_KEY` manquante, aucun DNS poussé.

**Étapes** :

- [ ] Compte créé sur resend.com.
- [ ] Onglet **API Keys** → créer une clé → copier `re_xxx`.
- [ ] Onglet **Domains** → ➕ → entrer ton domaine (ex `liberia.app`) → région **Frankfurt** (RGPD).
- [ ] Resend affiche 4 records DNS à pousser. Aller chez ton registrar :
  - Cloudflare : DNS → ajouter chaque record. ⚠️ Désactiver le proxy (cloud gris) pour TXT/MX.
  - OVH/Gandi : zone DNS → onglet records → add.
- [ ] Attendre 5-15 min puis Resend Dashboard → bouton **Verify DNS Records** → ✅.
- [ ] Vercel env vars (preview + prod) :
  ```
  RESEND_API_KEY=re_...
  RESEND_FROM_EMAIL=LIBERIA <coach@liberia.app>
  ```
- [ ] Redéployer.
- [ ] DMARC **Phase Bootstrap** : créer le record `_dmarc.liberia.app` avec `v=DMARC1; p=none; rua=mailto:dmarc@liberia.app`.
- [ ] Tester le reset password en réel (cf. Phase 2.7).
- [ ] mail-tester.com → envoyer un email LIBERIA à l'adresse fournie → score attendu **≥ 9/10**.

**Critère succès phase 1.2** : reset password reçu en INBOX (pas spam) + mail-tester ≥ 9/10.

**Après 1 semaine de prod** : passer DMARC en `p=quarantine`. Après 2 semaines : `p=reject`.

---

### 1.3 Apple Sign In (≈ 2-3 h)

**État actuel** : code prêt, env flag à activer, configuration Apple Developer manquante.

**Pré-requis** : compte **Apple Developer Program** payant (99 USD/an).

**Étapes** : suivre `APPLE_SIGNIN_SETUP.md` dans l'ordre — c'est conçu pour être linéaire.

- [ ] §2.1 — Créer l'**App ID** avec capability Sign In with Apple.
- [ ] §2.2 — Créer le **Services ID** (`app.liberia.web.signin`) + domain + return URL.
- [ ] §2.3 — Créer la **Key .p8** + télécharger (1 seule fois !) + noter le Key ID.
- [ ] §3.1 — Générer le **JWT secret 180 jours** avec le script Node.
- [ ] §3 — Supabase Dashboard → Auth → Providers → **Apple** → coller Client ID + JWT secret.
- [ ] Supabase → Auth → URL Configuration → Site URL = `https://liberia.app` + ajouter `/auth/callback` aux Redirect URLs whitelist.
- [ ] Vercel env :
  ```
  NEXT_PUBLIC_AUTH_APPLE_ENABLED=true
  NEXT_PUBLIC_APP_URL=https://liberia.app
  ```
- [ ] **Important** : poser un rappel calendrier "Renouveler JWT Apple" à J+150.

**Critère succès phase 1.3** : sur `/login` en prod, le bouton "Continuer avec Apple" apparaît et un test sur iPhone réel ouvre la pop-up Apple.

**Si tu ne veux pas Apple maintenant** : laisser `NEXT_PUBLIC_AUTH_APPLE_ENABLED=false` (défaut). Aucun bouton mort. Mais **App Store refusera ton wrapper iOS** si Google SSO est activé sans Apple — donc soit les deux, soit aucun.

---

### 1.4 Supabase OAuth Google (optionnel — ≈ 30 min)

**État actuel** : framework prêt côté code, provider Google non configuré côté Supabase.

- [ ] Google Cloud Console → projet existant ou nouveau → **APIs & Services → Credentials**.
- [ ] Create Credentials → OAuth Client ID → Web application.
- [ ] Authorized redirect URIs : `https://<TON_PROJET>.supabase.co/auth/v1/callback` (l'URL Supabase, pas la tienne).
- [ ] Copier Client ID + Client Secret.
- [ ] Supabase Dashboard → Auth → Providers → **Google** → activer + coller les deux.
- [ ] Vercel env : `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.

**Critère succès** : bouton "Continuer avec Google" visible sur `/login`, test réussi sur n'importe quel browser.

**Note App Store** : si tu actives Google, tu **dois** activer Apple aussi (cf. 1.3).

---

### 1.5 Variables Vercel — Récapitulatif

**Toutes les env vars à vérifier dans Vercel → Settings → Environment Variables** (cocher Preview ET Production) :

#### Obligatoires
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` *(critique pour delete account + webhook Stripe)*
- [ ] `NEXT_PUBLIC_APP_URL` *(critique pour Stripe redirects + OAuth)*
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY`
- [ ] `ANTHROPIC_API_KEY` *(sinon Coach IA en mode dégradé)*
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `CRON_SECRET` *(auto-injecté par Vercel Cron si activé)*

#### Recommandées
- [ ] `UPSTASH_REDIS_REST_URL` *(rate-limit Stripe/AI/auth)*
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` *(observabilité)*
- [ ] `SENTRY_AUTH_TOKEN` *(upload source maps)*

#### Social login (selon activation)
- [ ] `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` (si Apple configuré)
- [ ] `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` (si Google configuré)

**Astuce** : exporter via Vercel CLI pour audit :
```
vercel env pull .env.production.local --environment=production
```
Comparer le résultat à la liste ci-dessus.

---

### 1.6 Check environnement (≈ 15 min)

Après tout pousser, déployer en preview puis vérifier :

- [ ] `<preview-url>/api/csp-report` → ne pas l'ouvrir directement, mais après une navigation : Vercel Functions logs → aucun `[csp-violation]` non attendu.
- [ ] `<preview-url>/robots.txt` → contenu attendu.
- [ ] `<preview-url>/sitemap.xml` → renvoie XML valide.
- [ ] `<preview-url>/manifest.webmanifest` → JSON avec name=LIBERIA + icons.
- [ ] `<preview-url>/icon` → favicon SVG/PNG.
- [ ] `<preview-url>/opengraph-image` → image 1200x630 navy avec "Reprends le contrôle".
- [ ] `<preview-url>/api/stripe/webhook` (GET) → 405 Method Not Allowed (attendu).
- [ ] DevTools → Network → vérifier les headers de réponse de `/dashboard` :
  - `Content-Security-Policy: default-src 'self'; ...`
  - `Strict-Transport-Security: max-age=63072000; ...`
  - `X-Frame-Options: DENY`
  - `Reporting-Endpoints: csp-endpoint="/api/csp-report"`

**Si l'un de ces checks échoue** : noter exactement quel header + URL + appeler Claude. Pas de devinette.

---

## Phase 2 — Tests utilisateur réels

**Objectif** : parcourir un cycle de vie complet d'un utilisateur réel. Pas de jeu de
données démo. Pas de stub. Vraie carte Stripe test. Vrai email perso.

**Pré-requis** : Phase 1 terminée et verte. Preview Vercel déployé avec toutes les env vars.

Tester sur **2 surfaces** : **iPhone Safari réel** + **desktop Chrome**. Idéalement aussi
Android Chrome si tu en as un sous la main.

### 2.1 Inscription email/password (≈ 5 min)

- [ ] Ouvrir `/register` en navigation privée.
- [ ] Email = adresse perso jamais utilisée (Gmail/Proton fonctionne).
- [ ] Mot de passe ≥ 12 caractères, mix maj/min/chiffres.
- [ ] Cocher CGU.
- [ ] Submit.
- [ ] **Attendu** : toast "Compte créé" + redirect `/onboarding` OU email confirmation reçu si Supabase Auth > Confirm email = ON.

**Symptômes à signaler** :
- Bouton submit ne réagit pas → JS error Vercel logs.
- Toast d'erreur "Impossible" → check Supabase URL/anon key.
- Email reçu en spam → DKIM/SPF KO (Phase 1.2 à revoir).

### 2.2 Inscription via social login (≈ 3 min, si Phase 1.3 ou 1.4 faite)

- [ ] Sur `/register`, cliquer "Continuer avec Apple" (depuis iPhone).
- [ ] Pop-up Apple → confirmer avec Face ID.
- [ ] **Attendu** : redirect `/onboarding` ou `/dashboard` avec session active.
- [ ] Idem "Continuer avec Google" depuis n'importe quel browser.

### 2.3 Onboarding complet (≈ 8-10 min)

- [ ] Parcourir toutes les étapes du wizard `/onboarding` (revenu, dépenses, objectifs, profil, ton).
- [ ] Pas survoler les questions — répondre comme un vrai user.
- [ ] **Attendu** : à la fin, redirect `/design-match/dashboard-v3` avec données pré-remplies.

**Symptômes à signaler** :
- Une étape ne valide pas son input → toast Zod error.
- Données pas persistées (revenir à `/onboarding` = recommencer) → check `supabase.financial_profiles` insert.

### 2.4 Dashboard (≈ 5 min)

- [ ] Sur `/design-match/dashboard-v3` : tous les composants se rendent (Score, Hero, EvolutionCard, etc.).
- [ ] Aucun élément ne déborde du viewport iPhone 375.
- [ ] Le bouton "Coach IA" mène à `/design-match/coach-v3`.
- [ ] Le bouton "Ouvrir le plan" mène à `/design-match/plan-v3`.

### 2.5 Coach IA (≈ 10 min)

- [ ] `/coach` (ou nouvelle conversation depuis `/design-match/coach-v3`).
- [ ] Taper "Comment je peux économiser 200 CHF/mois ?" → envoyer.
- [ ] **Attendu** : streaming SSE de la réponse, ton bienveillant, pas de hallucination grossière.
- [ ] Tester aussi une question hors-finance ("quel est le sens de la vie") → **attendu** : refus poli + recentrage finance.

**Si `requirePremiumAccess` te bloque alors que tu es en trial** : check `subscriptions.status` SQL — doit être `trialing` ou `active`.

### 2.6 Paiement Stripe (Test mode, ≈ 5-10 min)

- [ ] `/settings/subscription` → cliquer "Commencer l'essai mensuel" (Premium).
- [ ] Stripe Checkout s'ouvre.
- [ ] Carte : `4242 4242 4242 4242` / `12/30` / `123` / code postal `1000`.
- [ ] Submit.
- [ ] **Attendu** : redirect `/settings/subscription?status=success` + banner "Essai en cours, fin dans 14 jours".
- [ ] SQL : `select status, plan, trial_ends_at from subscriptions where user_id = ...` → `trialing`, `premium`, J+14.

**Erreurs courantes** :
- "No such price" → mauvais `price_*` dans env Vercel.
- Redirect vers `error=...` → webhook pas branché ou `STRIPE_WEBHOOK_SECRET` faux.

### 2.7 Reset password (≈ 5 min)

- [ ] Se déconnecter.
- [ ] `/forgot-password` → entrer son email → submit.
- [ ] **Attendu** : toast success.
- [ ] Vérifier la boîte mail dans **les 30 secondes** :
  - INBOX (pas spam) ✅
  - Expéditeur visible "LIBERIA <coach@liberia.app>"
  - Lien dans le mail.
- [ ] Cliquer le lien → atterrir sur `/reset-password` avec session active.
- [ ] Nouveau mot de passe → submit → redirect dashboard.

**Si l'email arrive en spam** : Phase 1.2 incomplète, refaire les checks DNS + DMARC.

### 2.8 Annulation abonnement (≈ 5 min)

- [ ] `/settings/subscription` → "Gérer mon abonnement" → portail Stripe.
- [ ] Cancel subscription (option "à la fin de la période").
- [ ] Revenir sur LIBERIA → banner "Abonnement annulé, accès jusqu'au JJ/MM".
- [ ] SQL : `cancel_at_period_end = true`.
- [ ] Re-tester Coach IA → toujours accessible (trial actif jusqu'à fin de période).

### 2.9 Resubscribe (anti-abuse trial, ≈ 5 min)

- [ ] Toujours dans le portail Stripe → "Renew now" OU repasser par `/settings/subscription` → "Commencer l'essai mensuel".
- [ ] **Attendu** : Stripe Checkout demande paiement **IMMÉDIAT** (pas 14 jours gratuits).
- [ ] Confirmer le test que `trial_used = true` empêche le second essai gratuit.

### 2.10 Suppression de compte RGPD (≈ 5 min)

- [ ] `/design-match/parametres-v3` → section "Données & confidentialité" → "Supprimer mon compte".
- [ ] Première confirmation → OK.
- [ ] Prompt → taper exactement le mot-clé i18n.
- [ ] **Attendu** : redirect `/?account_deleted=1` + déconnexion immédiate.
- [ ] Réessayer `/login` avec les mêmes credentials → erreur "Invalid login credentials".
- [ ] SQL : `select count(*) from subscriptions where user_id = '<uid>';` → **0**.
- [ ] Stripe Dashboard → subscription status → **canceled**.

**Critique** : ce test prouve que le droit à l'effacement RGPD/LPD est réel et non-théorique.

### 2.11 iPhone Safari réel (≈ 15 min)

À faire EN PLUS des tests fonctionnels ci-dessus, sur un vrai iPhone (pas le simulateur) :

- [ ] Ouvrir Safari → preview URL.
- [ ] **Pinch zoom** désactivé (viewport correct) → vérifier en pinçant : refus.
- [ ] **Safe area** : aucun contenu sous l'encoche/dynamic island.
- [ ] **Bottom nav** : pas masqué par la home indicator.
- [ ] **Drawer / Bottom sheet** : ouvrir et fermer sans glitch.
- [ ] **Inputs** : focus → clavier monte sans zoom (fontSize 16 minimum).
- [ ] **Add to Home Screen** : Safari → Share → Sur l'écran d'accueil.
  - Icône bien rendue (Apple icon dynamique).
  - Splash blanc → app s'ouvre standalone.
- [ ] **Orientation paysage** : pas de débordement.

### 2.12 Desktop Chrome (≈ 10 min)

- [ ] DevTools → Network → vérifier headers (cf. Phase 1.6).
- [ ] DevTools → Console → aucune erreur rouge sur les pages clés (`/dashboard`, `/coach`, `/settings/subscription`).
- [ ] DevTools → Application → Manifest → bouton "Add to homescreen" disponible.
- [ ] DevTools → Lighthouse → audit Mobile :
  - Performance : viser ≥ 80 (90+ idéal).
  - Accessibility : viser ≥ 95.
  - Best Practices : viser ≥ 95.
  - SEO : viser ≥ 95.
  - PWA : Installable ✅.

### 2.13 Tableau de bord des tests

Compiler dans un Notion/Google Sheet :

| Test | iPhone Safari | Desktop Chrome | Statut |
|---|---|---|---|
| 2.1 Inscription email | ⬜ | ⬜ | |
| 2.2 Social login | ⬜ | ⬜ | |
| 2.3 Onboarding | ⬜ | ⬜ | |
| 2.4 Dashboard | ⬜ | ⬜ | |
| 2.5 Coach IA | ⬜ | ⬜ | |
| 2.6 Paiement test | ⬜ | ⬜ | |
| 2.7 Reset password | ⬜ | ⬜ | |
| 2.8 Annulation | ⬜ | ⬜ | |
| 2.9 Resubscribe | ⬜ | ⬜ | |
| 2.10 Delete account | ⬜ | ⬜ | |
| 2.11 PWA install | ⬜ | ⬜ | |
| 2.12 Lighthouse mobile | n/a | ⬜ | |

**Critère succès phase 2** : 100% des cases cochées vertes, ou bugs identifiés et passés à Claude avec un repro précis.

---

## Phase 3 — Décision GO / NO-GO

### 3.1 Critères GO publique (vente sans accompagnement)

**Tous** doivent être vrais :

1. ✅ Phase 1 complète (4 services activés + 14 env vars + check environnement vert).
2. ✅ Phase 2 : 12/12 tests verts sur iPhone + desktop.
3. ✅ Stripe **Live mode** activé (KYC validé) avec webhooks 100% delivery success sur 24h.
4. ✅ Resend **DMARC `p=quarantine`** au minimum (`p=reject` idéal après 2 semaines).
5. ✅ Apple Sign In activé (si tu veux un wrapper iOS).
6. ✅ Review juridique CH des CGU + Privacy par un cabinet (compter 500-1500 CHF).
7. ✅ Endpoint `coach@liberia.app` reçoit les bounces (sinon support invisible).
8. ✅ Sentry actif et alertes configurées (5xx > 1% / 5min → email).

**Si tout est vert** → ouverture publique.

### 3.2 Critères GO early-adopter accompagné (vente limitée, NDA possible)

**Tous** doivent être vrais :

1. ✅ Phase 1 minimale : Stripe Test + Resend + Vercel env vars (Apple/Google optionnels).
2. ✅ Phase 2 : tests 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.10 verts (les autres souhaitables).
3. ✅ Stripe peut rester en Test mode si tu factures à la main (offre dépôt manuel) — sinon Live obligatoire.
4. ✅ DMARC en `p=none` accepté (bootstrap).
5. ✅ Discours commercial explicite : "produit en bêta privée, support 1-1, pas d'engagement long".

**Si tout est vert** → ouverture early-adopter accompagné.

### 3.3 Critères NO-GO immédiats (stop tout)

Si l'un de ces points est rouge, **ne vends à personne** :

- 🔴 Webhook Stripe retourne 5xx sur > 1% des events.
- 🔴 Delete account échoue à supprimer la subscription Stripe.
- 🔴 Reset password jamais reçu (pas même en spam).
- 🔴 Lighthouse PWA "non installable" en mobile.
- 🔴 CSP report endpoint reçoit > 50 violations/h (politique mal calibrée).
- 🔴 Sentry remonte plus de 5 erreurs 5xx /h sur une route core.

### 3.4 Checklist exacte avant ouverture

**Le jour J avant publication** :

- [ ] Backup Supabase fresh (Dashboard → Database → Backups → Create now).
- [ ] Stripe Dashboard → Subscriptions → vide ou contient uniquement tes comptes test (supprimer).
- [ ] Supabase → Authentication → Users → vide hors comptes test.
- [ ] Vercel → Deployments → Promote preview to production.
- [ ] DNS A record pointe sur `cname.vercel-dns.com` (custom domain attaché).
- [ ] HTTPS Vercel "managed" actif → cadenas vert dans Safari/Chrome.
- [ ] `/sitemap.xml` accessible en prod.
- [ ] Premier achat réel (toi-même avec ta vraie carte) → vérifier que ça passe.
- [ ] Annuler immédiatement ton propre abonnement après le test.

### 3.5 Répartition des rôles

#### Ce que TU dois faire (humain, irremplaçable)

- Créer les comptes Stripe / Resend / Apple Developer / Google Cloud.
- Configurer les services tiers (UI Dashboard Stripe, console Apple).
- Pousser les records DNS chez ton registrar.
- Pousser les env vars dans Vercel.
- **Faire la Phase 2 sur iPhone réel + desktop**.
- Activer KYC Stripe pour le mode Live.
- Engager un juriste CH pour review CGU/Privacy.

#### Ce que CLAUDE peut encore corriger

Uniquement si un bug est identifié en Phase 2 :

- Bug d'affichage CSS / overflow mobile → fix + push.
- Bug logique server action / API route → fix + tests.
- Texte i18n incorrect / oublié → patch + push.
- Bug d'intégration Stripe webhook (si répétable et trace claire).
- Régression de tests automatiques.

**Claude ne peut PAS** :
- Configurer Stripe Dashboard.
- Créer un compte Apple Developer.
- Pousser des records DNS.
- Décider du contenu juridique des CGU.

#### Ce qui nécessite un tiers

| Action | Acteur | Délai |
|---|---|---|
| KYC Stripe Live | Stripe (toi + KYC review) | 1-3 jours |
| Apple Developer Program | Apple (toi + validation Apple) | 24-48 h |
| Validation domaine Resend | Toi (DNS propagation) | 15 min - 24 h |
| Review CGU / Privacy CH | Juriste CH | 1-2 semaines, 500-1500 CHF |
| Stripe Tax automatic CH | Stripe Tax onboarding | 2-3 jours |
| Verified business email (`coach@`) | Google Workspace / Proton | 30 min |

### 3.6 Plan de mitigation post-lancement (semaine 1)

Dès qu'un humain réel paie pour LIBERIA :

- [ ] **Jour 1** : Sentry ouvert toute la journée, monitor toutes les nouvelles erreurs.
- [ ] **Jour 1-7** : vérifier Stripe Dashboard → Webhooks → 100% success quotidien.
- [ ] **Jour 1-7** : vérifier Resend Dashboard → bounce rate < 2%, complaint rate < 0.1%.
- [ ] **Semaine 1** : appeler les 3-5 premiers utilisateurs pour debrief (NPS qualitatif).
- [ ] **Semaine 1** : vérifier que **personne** ne se retrouve facturé après cancel (bug critique).
- [ ] **Semaine 2** : DMARC `p=none` → `p=quarantine`.
- [ ] **Semaine 4** : DMARC `p=quarantine` → `p=reject`.

---

## Résumé exécutif

**Tu es ici** : code 100 % prêt (sprint S3 fermé). Note 860/1000.

**Pour atteindre "vente publique"** : 2-3 jours d'activation + tests.

**Étape immédiate suggérée** : démarrer Phase 1.1 (Stripe Test) demain matin.
Compte 2-3h en focus, sans interruption. Si rien ne déraille, tu finis Phase 1
complète dans la journée, Phase 2 le lendemain.

**Critère personnel à te fixer avant publication** : as-tu fait **toi-même** un cycle
inscription → onboarding → paiement → annulation → suppression sur un iPhone
réel, avec ta vraie carte, en mode Live ? Si non, ne vends pas. Si oui : tu
peux ouvrir.

Bonne chance. 🚀
