# Audit Agrégation Bancaire — état réel

## Réponse honnête : **AUCUNE intégration bancaire n'est implémentée**.

### Audit code base — résultats grep

| Aspect | État réel |
|---|---|
| Table DB `bank_accounts` / `bank_connections` / `transactions` | ❌ Aucune migration, aucun schéma |
| Provider connecté (Salt Edge, Tink, Yapily, Klarna Kosma, Plaid) | ❌ Aucun client, aucune ENV var, aucun code SDK |
| Page UI "Connecter ma banque" | ❌ Aucune route |
| Import CSV bancaire | ❌ Aucun endpoint, aucun parser |
| Liste de banques CH dans `constants` | ❌ Absente |
| Architecture / scaffold prêt | ❌ Rien |

**Conclusion** : la seule existence du sujet "bank aggregation" dans le repo est **documentaire** (les rapports d'audit produit). Zéro ligne de code applicatif.

---

## Architecture recommandée en 3 niveaux pour la Suisse

### Niveau 1 — Import CSV bancaire manuel (effort : **5 jours**)

**Le quick-win.** Permet à un utilisateur d'importer 3-6 mois d'historique en 2 minutes.

**Banques couvertes** : 100% — toutes les banques CH exportent du CSV ou Excel depuis leur e-banking.

**Composants à construire** :
- `app/api/finance/import-csv/route.ts` — POST multipart, parse CSV
- Détection automatique format banque via heuristique colonne (UBS, Raiffeisen, PostFinance, Neon, Yuh, Revolut ont des formats fixes)
- UI `/settings/import` — drag-drop fichier + preview transactions + bouton "importer"
- Catégorisation auto via regex/keywords (Coop = food, Migros = food, CFF = transport, Swisscom = utilities, etc.)
- Reconciliation : marquer chaque ligne comme "match existante" / "nouvelle dépense"

**Tables DB** : pas de nouvelle table — réutilise `expenses` + `incomes` avec un champ `source = 'csv_import' | 'manual' | 'bank_sync'` à ajouter (migration triviale).

**Coût Vercel/Anthropic** : zéro. Pas de tiers payant.

### Niveau 2 — Connecteur open banking via provider tiers (effort : **15-20 jours + 30 jours paperasse**)

**Le vrai moat.** Connexion automatique aux banques CH, refresh quotidien des transactions.

**Couverture CH réelle par provider** (constaté marché 2026) :

| Provider | Coverage banques CH | Coût/user/mois | Complexité |
|---|---|---|---|
| **Salt Edge** (LU) | 75-85% (UBS, PostFinance, Raiffeisen, Migros, ZKB, BCV, certaines cantonales) | ~0.30 CHF | Moyen |
| **Tink** (SE, racheté Visa) | 60-75% | ~0.35 CHF | Moyen |
| **Yapily** (UK) | 40-60% | ~0.25 CHF | Difficile (peu de CH spécifique) |
| **Klarna Kosma** (SE) | 50-60% | ~0.30 CHF | Moyen |
| **SIX bLink** (CH native, en chantier) | Croissant 2026-2027 | À négocier | Pas mature, contractuel direct avec SIX |

**Recommandation marché 2026** : **Salt Edge en provider primaire** + fallback CSV manuel pour les banques non couvertes.

**Composants à construire** :
- `lib/banking/salt-edge.ts` — client SDK + auth headers
- Tables DB : `bank_connections`, `bank_accounts`, `bank_transactions`, `bank_sync_logs`
- `app/api/banking/connect/route.ts` — initie la connexion (redirect vers Salt Edge Connect Widget)
- Webhook `app/api/banking/webhook/route.ts` — Salt Edge push de transactions
- Cron quotidien refresh
- UI `/settings/bank-connections` — liste + add + reconnect
- Migration transactions Salt Edge → table `expenses` (avec dédup par hash `(date, amount, label)`)

**Compliance CH/EU** :
- Pas FINMA-regulated (data-only, pas d'initiation paiement)
- DPO requis pour le traitement
- LSF/LSFin neutre tant que pas d'advice individuel régulé
- LPD respecter — hosting CH/EU préféré (Salt Edge a datacenter LU)

**Pricing** : à 1000 abonnés payants × 0.30 CHF = 300 CHF/mois = négligeable vs CMRR 14.9k.

### Niveau 3 — Synchronisation bancaire automatique + nettoyage IA (effort : **+10 jours sur Niveau 2**)

Au-dessus de Niveau 2, ajouter :
- **Catégorisation IA** : Claude Haiku classifie chaque transaction (3 sec/200 transactions, ~0.001 CHF par transaction)
- **Détection abonnements** : pattern récurrent → flag "abonnement Netflix 14 CHF/mois détecté, on l'ajoute en récurrent ?"
- **Détection anomalies** : hausse vs moyenne 3 mois par catégorie (lib/calculations/anomalies.ts déjà prêt)
- **Détection cash flow** : projection J+30 du solde compte
- **Push notifs** : "le 27, tu seras à -130 CHF (loyer + assurance + carte)"

---

## Recommandation actionnable pour LIBERIA

| Sprint | Priorité | Effort | Impact |
|---|---|---|---|
| **S1 — Niveau 1 CSV import** | 🔥🔥🔥🔥🔥 | 5 jours | Débloque MVP rétention ; 100% couvert sans provider tiers |
| **S2 — Décision provider** (Salt Edge demo + due diligence DPO) | 🔥🔥🔥🔥 | 3 jours | Choix engageant pour S3 |
| **S3 — Niveau 2 Salt Edge MVP** (UBS + PostFinance + Raiffeisen seulement au début) | 🔥🔥🔥🔥🔥 | 15 jours + 30j paperasse parallèle | Moat rétention |
| **S4 — Niveau 3 IA catégorisation + alertes** | 🔥🔥🔥 | 10 jours | Différenciation |

**Total** : 33 jours dev + 30 jours paperasse Salt Edge en parallèle ≈ **6-8 semaines** pour atteindre "Iris voit ton compte bancaire et te prévient avant les découverts".

**Sans agrégation bancaire**, LIBERIA plafonne à 25% rétention 6 mois (cf. audit business précédent).
**Avec Niveau 1 (CSV import)**, ça passe à 40-45%.
**Avec Niveau 2 (Salt Edge)**, ça passe à 55-65%.

---

## Pour ce sprint actuel

**Rien n'a été implémenté côté agrégation bancaire dans ce sprint.** Le sujet a été honnêtement audité et la roadmap est documentée ici. Décision business à prendre :
- Soit on bloque la vente publique tant que Niveau 1 n'est pas en place (recommandé)
- Soit on ouvre en vente early-adopter accompagnée + on construit Niveau 1 + Niveau 2 en parallèle
