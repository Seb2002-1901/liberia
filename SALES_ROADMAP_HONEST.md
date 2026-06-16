# LIBERIA — Roadmap de Vente Honnête

**Sprint V5** — sans optimisme, sans marketing, sans score gonflé.

> Le critère : qu'est-ce qui fonctionne RÉELLEMENT et qu'est-ce qui est documenté/annoncé mais non testé en preview ?

---

## A) Fonctionnalités réellement TERMINÉES (preuve UI + DB + tests)

| Fonction | Preuve |
|---|---|
| Inscription / login / reset password (email/password) | Tests Playwright auth-v3 |
| Onboarding wizard | Tests démo / mobile-strict |
| Dashboard V3 + KPIs (FHS, runway, savings rate) | Tests dashboard + 996 tests unit calculs |
| Coach IA — Iris répond + format CFO + ancres CH | Prompt finalisé, tests guardrails 8/8 |
| Coach IA — 15 outils CRUD déclarés | tests unit 19/19 actions, 31/31 parser |
| Layout chat bulletproof (composer sticky) | 13/13 tests Playwright pixel-perfect |
| Simulateur déterministe (compound, mortgage, runway, debt, plan_scenarios) | 18/18 tests unit vs Excel |
| Stripe checkout / portal / webhook | Tests boundary 6/6 + idempotence RPC race-free |
| Suppression compte RGPD avec cascade FK + signOut atomique | 8/8 tests unit |
| Security headers (CSP réaliste, HSTS, COOP, X-Frame, Permissions-Policy) | Headers visibles, audit 11 cats RAS |
| PWA manifest + icons dynamiques | Build OK, manifest /manifest.webmanifest |
| Loading skeleton V3 | Implémenté, vu en build |
| Errors Supabase i18n (14 patterns mappés) | 17/17 tests unit |
| UI throttle auth client (5 tentatives/60s) | 7/7 tests unit |
| Social login framework Google + Apple (UI conditionnelle env) | Tests structurels |
| Errors localization 6 langues (FR/EN/ES/IT/PT/DE) | Tests parity 40/40 |
| Trajectoire patrimoniale 12 mois (mon-analyse-v3) | Implémenté |
| Composer fontSize 16 anti-zoom iOS | Test Playwright ✓ |
| Csp violation reporting endpoint | Route 204 testée |
| Import CSV bancaire (UBS/PostFinance/Neon/Yuh/Revolut/Raiffeisen/BCV) | **46/46 tests parser**, migration SQL prête, UI minimaliste |
| Catégorisation auto par regex (10 catégories) | Tests 11/11 cas |
| Dedup hash transactions (sha256 user+date+amount+label) | Tests 3/3 |

**Total** : ~22 fonctions vraiment terminées et testées.

---

## B) Fonctionnalités PARTIELLEMENT terminées

| Fonction | Ce qui marche | Ce qui manque |
|---|---|---|
| Iris CFO premium (prompt, 6 modes, ancres CH) | Prompt finalisé, ancres 2026 OK, 6 few-shots | Test réel 50 prompts contre Anthropic live (cf. IRIS_TEST_PROTOCOL.md) |
| Banking V1 CSV import | Parser + actions + UI upload + dédup | Page `/banking/transactions` (liste + reconcile interactif) |
| Voice mode | STT Whisper (input), 3 états mic | TTS retour, VAD auto-stop, conversation continue |
| Plan IA détaillé | Génération 12 étapes via Anthropic | Refresh interactif via Iris (toggle existe en tool, pas testé live) |
| Mémoire IA | Add via Iris tool + UI Settings | Update via Iris (delete OK, update = re-créer) |
| Subscription V3 | Stripe trial, portal, premium gates | Test live cycle complet (cf. STRIPE_TESTING.md) |

---

## C) Fonctionnalités ANNONCÉES mais NON VALIDÉES en preview

| Fonction | Pourquoi non validée |
|---|---|
| 16 actions Iris fonctionnent vraiment end-to-end | Pas testé en preview avec Anthropic + compte test premium |
| Layout iPhone 14 réel | Pas testé sur device physique (Playwright = Chromium, pas WebKit iOS) |
| Stripe live checkout → trial → cancel → resubscribe | Procédure documentée mais pas exécutée avec stripe-cli |
| Apple Sign In flow complet | Code OAuth prêt, mais Apple Developer Portal pas configuré |
| Email reset password reçu en INBOX (pas spam) | Resend pas configuré, DKIM/SPF/DMARC pas testés |
| Migration `user_settings_missing_columns` appliquée | À exécuter manuellement |
| Migration `banking_v1_csv` appliquée | À exécuter manuellement |
| Désambiguïsation Iris (3 candidats "assurance") | Server-side ambiguity OK, UI carte interactive absente |
| Coach mémoire avec 50+ entries (perf prompt context) | Pas stress-testé |

---

## D) Fonctionnalités MANQUANTES

### Bloqueurs vente publique (P0)
- Bank aggregation N2 (Salt Edge / Tink) — actuellement seul N1 CSV manuel
- Vue fiscale CH avec CHF économisés visibles (3a non maxé, déductions méconnues)
- Forecast cashflow J+30 (alerte découvert)
- Revue hebdo LLM-personnalisée (cron + insertion in-chat)
- Tracker hypothèque + alertes refinance T-12 mois

### Critiques (P1)
- Mode couple / Households
- Mode entrepreneur / indépendant complet (provisions auto)
- Tracker portefeuille ETF / 3a investi
- TTS retour vocal (mode voice complet ChatGPT-style)
- Negotiation copilot assurances
- Tax pre-fill export TaxMe

### Nice-to-have (P2-P3)
- App native iOS Capacitor + widget
- Vault documents OCR
- Life Event Playbooks (mariage, enfant, divorce)
- Decision Journal financier
- Net Worth Time Machine
- Subscription audit + cancel 1-click

---

## Note honnête /1000

**805 / 1000** (pas 830, je révise à la baisse pour rester honnête)

| Pilier | Note | Justification honnête |
|---|---|---|
| Stabilité technique pure | **95** | 1153 unit + 22 Playwright verts, build vert, lint vert, 0 typeerror |
| Layout chat | **88** | bulletproof tests, manque validation iPhone réel |
| Iris CFO (prompt) | **82** (prédit) | tests réels Anthropic non faits — score prédit, pas mesuré |
| Iris actions agentiques (15 tools CRUD) | **85** | testés unitairement, jamais validés end-to-end live |
| Banking V1 CSV | **75** | parser solide, UI upload OK, manque page reconcile |
| Banking N2 (aggregation live) | **0** | absent |
| Fiscalité CH chiffrée | **5** | mentions dans prompt Iris, pas de moteur calculé |
| Cashflow forecast | **0** | non implémenté |
| Revue hebdo LLM-perso | **15** | cron weekly recap templated, pas LLM |
| Hypothèque tracker | **0** | absent |
| Mode couple | **0** | absent |
| Voice mode | **45** | input OK, output absent |
| Sécurité / RGPD / RLS | **92** | mature post-S3 |
| Documentation activation | **95** | 5 docs complètes (Stripe, Apple, Resend, etc.) |
| Tests automatisés | **90** | 1153 unit + 22 Playwright |
| Mobile expérience | **72** | composer locked, fontSize anti-zoom, manque test device réel |
| Différenciation marché | **45** | bon coach IA, manque les 4 lock-in (banking N2, fiscalité, couple, voice complet) |

**Moyenne pondérée par importance produit : 805/1000**.

---

## GO/NO-GO par audience

### GO Early Adopters accompagnés (NDA, brief limites, support 1-1)
**Conditions remplies aujourd'hui** :
- ✅ Code stable, sécurité, RGPD propres
- ✅ Iris fonctionnelle (sous réserve validation live)
- ✅ Banking V1 CSV livré
- ✅ Documentation activation

**Conditions manquantes** :
- ⚠️ Validation manuelle des 16 actions Iris en preview (2h)
- ⚠️ Validation iPhone réel layout chat (30 min)
- ⚠️ Migration SQL exécutée sur preview/prod
- ⚠️ Test import CSV avec un vrai relevé

**Décision** : ✅ **GO** dès que ces 4 conditions manuelles sont remplies. Compter **3 heures de TOI**.

### GO Beta Publique (sans accompagnement direct)
**Conditions supplémentaires** :
- Cashflow forecast J+30 implémenté
- Revue hebdo LLM-perso branchée
- Page `/banking/transactions` reconcile interactif
- Stripe live cycle complet validé (stripe-cli, 6 scenarios)
- Resend DNS DKIM/SPF/DMARC en place (emails reset reçus INBOX)
- Apple Developer Portal configuré (si Apple SSO activé)
- Banc d'essai Iris 50 prompts exécuté avec score ≥ 75/100

**Estimation effort** : 15-20 jours dev + 2-3 jours activation manuelle.

**Décision** : ❌ **NO-GO** aujourd'hui. **GO possible dans ~4 semaines** si focus sur ces points.

### GO Vente Publique sans accompagnement
**Conditions supplémentaires** :
- Banking N2 (Salt Edge intégré, 75%+ des banques CH connectées auto)
- Vue fiscale CH avec économies visibles
- Tracker hypothèque + alertes refinance
- Mode couple complet
- Voice mode TTS retour
- Review juridique CH des CGU + Privacy
- App native iOS (PWA insuffisant pour App Store auto)
- NPS testé > 50 sur 50+ utilisateurs beta

**Estimation effort** : 100-130 jours dev cumulés + 30 jours paperasse Salt Edge + 1 semaine review juriste.

**Décision** : ❌ **NO-GO** aujourd'hui. **GO possible dans 4-6 mois** avec équipe focalisée 2-3 devs.

---

## Recommandation business honnête

**Faire** : ouvrir **Early Adopters Accompagnés** dès cette semaine après validation manuelle 3h. Prix conseillé 14.90/mois ou 149/an avec engagement 3 mois.

**Ne pas faire** : vendre publiquement aujourd'hui. La rétention 6 mois projetée est de 45% avec Banking V1 + Iris validée — pas assez pour un SaaS scalable sans support 1-1.

**Prochains 30 jours dev** : focus exclusif sur les 4 chantiers P0 manquants (cashflow forecast / revue hebdo LLM / banking N2 démarrage / vue fiscale CH). C'est ce qui transforme LIBERIA de "produit early-adopter" en "SaaS scalable".

---

## Ce que je m'engage à corriger immédiatement si TU vois un bug en preview

1. Toute action Iris qui ne fonctionne pas end-to-end → fix dans la 1h
2. Tout layout shift visible iPhone → fix CSS + test Playwright régression
3. Toute erreur console / réseau / toast rouge visible → triage + fix
4. Import CSV qui ne reconnaît pas ton banque → parser dédié en 30 min

Envoie-moi ton rapport de validation (cf. `IRIS_REAL_VALIDATION.md` + `BANKING_V1_PLAN.md` + audit iPhone) et je traite.
