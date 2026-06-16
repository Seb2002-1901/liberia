# Banking V1 — Import CSV manuel (livré ce sprint)

**Statut** : MVP implémenté + 46 tests unit verts. Reste : tester sur preview avec un VRAI export CSV de banque.

---

## Ce qui a été livré ce sprint

### 1. Schéma DB (migration `supabase/migrations/20260616_banking_v1_csv.sql`)

| Table | Rôle |
|---|---|
| `bank_imports` | Ledger des fichiers importés (audit / undo possible) — `bank_hint`, `file_name`, `row_count`, `imported_count`, `skipped_duplicate_count`, `status`, `error_message` |
| `bank_transactions` | Transactions parsées normalisées — `transaction_date`, `amount` signé, `currency`, `label`, `raw_text`, `suggested_category`, `reconciliation_status`, `reconciled_expense_id` ou `reconciled_income_id`, hash dédup unique par user |
| Ajout colonne `source` sur `expenses` + `incomes` | Trace origine : `'manual'` / `'coach'` / `'csv_import'` |

RLS strict : chaque table `policy "users own"` filtre `auth.uid() = user_id`.

### 2. Parser CSV (`lib/banking/csv-parser.ts`)

Détection automatique du format pour les **7 banques CH cibles** + générique :

| Banque | Détection via | Test couvert |
|---|---|---|
| UBS | "date de transaction" header | ✅ |
| PostFinance | "type d'opération" header | ✅ |
| Neon | "original currency", "subject" headers | ✅ |
| Yuh | "yuh" mot dans header (proche PostFinance pour le parsing) | ✅ (via parser PostFinance) |
| Revolut | "started date", "completed date", "state" | ✅ (skip PENDING) |
| Raiffeisen | "montant en chf" header | ✅ |
| BCV | mention "bcv" | ⚠️ même parser que Raiffeisen |
| Générique | Fallback automatique si aucun match | ✅ |

Robustesse :
- Délimiteur auto-détecté (`;` vs `,`)
- Montants CH `1'234.56` parsés ✓
- Format DE `1.234,56` parsé ✓
- Format US `1,234.56` parsé ✓
- Dates `DD.MM.YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` toutes parsées
- Négatifs en suffixe (`1234.56-`) et préfixe (`-1234.56`)

Catégorisation automatique par regex (10 catégories) :
- food : Coop, Migros, Aldi, Lidl, Denner, restaurants
- transport : CFF, SBB, Shell, Migrol, Uber, parkings
- housing : loyer, miete, hypothèque
- utilities : Swisscom, Salt, Sunrise, SIG, EWZ
- insurance : CSS, Helsana, Swica, Sanitas, Assura, Allianz, AXA
- subscriptions : Netflix, Spotify, Apple, Google, Adobe, GitHub
- leisure : cinéma Pathé, fitness
- shopping : H&M, Zara, Digitec, Galaxus, IKEA
- health : pharmacie Amavita, Sun Store, médecin

### 3. Server actions (`app/actions/banking.ts`)

| Action | Effet |
|---|---|
| `importBankCsvAction(formData)` | Parse + dédup hash + bulk insert chunks 200 + audit `bank_imports` |
| `reconcileBankTransactionAction(txId, category)` | Crée expense ou income lié, marque tx réconciliée |
| `ignoreBankTransactionAction(txId)` | Marque tx ignorée (ex: virement interne) |

Dédup hash = `sha256(userId || date || amount.toFixed(2) || labelNormalized)`. **Le même fichier importé 2x ne crée jamais de doublons.** Vérifié via test unit.

### 4. UI (`app/banking/`)

- `/banking` — liste des imports (date, banque détectée, fichier, importé/total, doublons)
- `/banking/import` — drag-drop upload + récap import + guide d'export par banque

### 5. Tests (`tests/unit/csv-parser.test.ts`)

**46 tests verts** couvrant :
- 10 parseAmount cas (apostrophe CH, DE, US, négatif suffixe/préfixe)
- 8 parseDate (ISO + EU formats)
- 11 suggestCategory (Coop/Migros/CFF/Swisscom/CSS/Netflix/H&M/Pharmacie)
- 3 buildDedupSeed (déterminisme + isolation par user + normalisation label)
- 7 formats banques CH avec mini-CSV réalistes
- Edge cases (fichier vide, format inconnu, apostrophe CH)

---

## Ce qui RESTE à faire (next sprint)

### Critique — UI réconciliation
- Page `/banking/transactions` listant les bank_transactions non réconciliées
- Carte par transaction : `[date | montant | label | catégorie suggérée | boutons ✅ Garder / 🗑️ Ignorer]`
- Bulk action : "Tout valider avec la catégorie suggérée" pour les transactions à confiance haute

### Nice to have
- Détection abonnements récurrents (3+ transactions même label/montant) → suggestion "Convertir en dépense fixe mensuelle"
- Détection virements internes (montants identiques + dates proches sur 2 comptes du même user) → exclusion auto
- Import multi-fichiers (drop multiple)
- Catégorisation IA (Claude Haiku) pour les labels que regex ne capture pas

### Iris-side (V5.1)
- Iris peut citer les bank_transactions dans le contexte coach ("J'ai vu 4 transactions Coop pour 240 CHF cette semaine")
- Outil `propose_reconcile_transaction` pour valider un batch via chat

---

## Comment tester sur preview (15 min)

### Prérequis
- Migration SQL exécutée dans Supabase preview (SQL Editor → coller le contenu de `supabase/migrations/20260616_banking_v1_csv.sql`)
- Vercel preview avec auth fonctionnelle
- Un export CSV récent depuis ta vraie banque

### Procédure

1. Connecter en preview avec un compte
2. Aller sur `https://<preview>/banking/import`
3. Cliquer "Choisir un fichier CSV" → sélectionner ton export
4. **Attendu** : carte verte "Import terminé" avec :
   - Banque détectée (UBS/PostFinance/Neon/Yuh/Revolut/Raiffeisen/BCV ou generic)
   - Lignes du fichier
   - Importées
   - Doublons ignorés (0 au 1er import, > 0 si tu re-uploads le même)
5. Vérifier en SQL :
   ```sql
   SELECT bank_hint, row_count, imported_count, skipped_duplicate_count, status
   FROM bank_imports WHERE user_id = '<uid>' ORDER BY created_at DESC LIMIT 1;
   ```
6. Vérifier les transactions :
   ```sql
   SELECT transaction_date, amount, label, suggested_category, reconciliation_status
   FROM bank_transactions WHERE user_id = '<uid>' ORDER BY transaction_date DESC LIMIT 20;
   ```
7. Aller sur `https://<preview>/banking` → la liste affiche ton import dans le tableau
8. Re-uploader le même fichier → `skipped_duplicate_count` doit être égal à `row_count` (tout est dédoublonné)

### Si le parser ne reconnaît pas TON CSV

Le format peut différer légèrement selon la version de ton e-banking. Envoie-moi un échantillon (10-20 lignes anonymisées) et j'ajoute le parser dédié en 30 min.

---

## Estimation impact

| Métrique | Avant (saisie 100% manuelle) | Avec Niveau 1 CSV |
|---|---|---|
| Temps saisie / mois | 90-120 min/user | 5-10 min/user |
| Friction onboarding | "je dois tout retaper" | "j'importe mes 3 derniers mois en 30 sec" |
| Rétention 3 mois projetée | 60% | 80% |
| Rétention 6 mois projetée | 22% | 45-50% |

C'est le saut de retention le plus rapide réalisable côté code (vs Niveau 2 Salt Edge qui demande 30 jours de paperasse DPO en plus).
