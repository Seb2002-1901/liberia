# IRIS — Validation Réelle des Actions IA

**Sprint V5** — protocole exécutable sur preview pour valider que CHAQUE action Iris fonctionne RÉELLEMENT, pas juste structurellement.

> **Règle absolue** : aucune action n'est considérée "OK" sans preuve UI + preuve DB + preuve revalidation visible.

---

## Honnêteté préliminaire

Je ne peux pas exécuter ces tests depuis cette session : pas d'`ANTHROPIC_API_KEY` ni Supabase configurés. Ce document est la **checklist exhaustive** pour que TOI tu exécutes sur preview Vercel et que tu remplisses.

### Ce qui est DÉJÀ prouvé structurellement (tests unit + lint + typecheck + build)

| Élément | Preuve dans le repo |
|---|---|
| 15 outils Iris déclarés correctement | `lib/coach/tools.ts` (typecheck ✓) |
| 15 server actions appelées par les outils | `app/actions/coach-actions.ts` (1107 tests unit ✓) |
| Validation Zod sur chaque payload | tests unit `coach-confirm-actions.test.ts` (19/19 ✓) |
| Parser SSE strict (rejette no-op) | tests unit `proposed-action-types.test.ts` (31/31 ✓) |
| RLS .eq("user_id", user.id) sur chaque update/delete | grep code ✓ |
| Revalidate des pages cibles après action | grep `revalidatePath` ✓ |
| Désambiguïsation ILIKE (0/1/>1 match) | tests unit ambiguity cases ✓ |

**Ce qui reste à prouver** : que Anthropic DÉCLENCHE bien chaque outil sur les prompts réalistes et que l'UI + DB suivent end-to-end.

---

## Préparation compte test (10 min)

1. Vercel preview avec `ANTHROPIC_API_KEY` + Supabase + Stripe test configurés
2. Register `iris-realval-<date>@gmail.com`
3. Onboarding minimal : revenu 5'200, dépenses 4'600, objectif "Fonds urgence"
4. Activer Premium trial (carte test 4242)
5. Préparer Supabase SQL editor pour les preuves DB (URL : Dashboard → SQL Editor)

---

## Matrice de validation — 15 actions Iris

Pour chaque ligne :
- Tape le prompt
- Capture screenshot de la carte affichée
- Clique "Confirmer"
- Capture screenshot du toast / message confirmation
- Lance la requête SQL en parallèle pour preuve DB
- Lance la requête vérification revalidation (URL cible)

### Tableau de progression à remplir

| # | Action | Prompt utilisateur | Tool attendu | Carte UI vue ? | Toast vu ? | Preuve SQL ? | Revalidation page ? | Statut |
|---|---|---|---|---|---|---|---|---|
| 1 | Créer dépense | `rajoute 42 CHF Coop` | `propose_expense` | | | | | |
| 2 | Créer 3 dépenses en 1 phrase | `5 CHF supermarché, 200 assurance, 800 bureau` | `propose_expense` ×3 | | | | | |
| 3 | Créer revenu | `revenu +800 prime` | `propose_income` | | | | | |
| 4 | Créer budget | `mets 600 CHF de budget nourriture` | `propose_budget` | | | | | |
| 5 | Créer objectif | `crée objectif voyage Japon 5000 CHF dans 18 mois` | `propose_goal` | | | | | |
| 6 | Modifier dépense | `corrige la dépense Coop, c'était 45 pas 42` | `propose_update_expense` | | | | | |
| 7 | Modifier revenu | `mon salaire passe à 5500` | `propose_update_income` | | | | | |
| 8 | Modifier budget | `cap nourriture à 700` | `propose_budget` (upsert) | | | | | |
| 9 | Modifier objectif | `change voyage Japon à 7000` | `propose_update_goal` | | | | | |
| 10 | Supprimer dépense | `supprime la dépense Coop` | `propose_delete_expense` | | | | | |
| 11 | Supprimer revenu | `efface la prime` | `propose_delete_income` | | | | | |
| 12 | Supprimer budget | `supprime mon cap nourriture` | `propose_delete_budget` | | | | | |
| 13 | Supprimer objectif | `efface l'objectif voyage Japon` | `propose_delete_goal` | | | | | |
| 14 | Créer mémoire | `rappelle-toi que je veux acheter une moto en 2027` | `propose_add_memory` | | | | | |
| 15 | Supprimer mémoire | `oublie ma note moto` | `propose_delete_memory` | | | | | |
| 16 | Cocher étape plan | `marque l'étape fonds urgence comme terminée` | `propose_toggle_plan_step` | | | | | |

### Légende statut
- ✅ : carte + toast + DB + revalidation tous ok
- ⚠️ : marche mais quelque chose à corriger (préciser)
- ❌ : ne marche pas (préciser cause)

---

## Requêtes SQL de preuve DB

Pour chaque action, exécuter dans Supabase SQL editor :

### 1. Créer dépense
```sql
SELECT id, label, amount, category, frequency, source, created_at
FROM expenses
WHERE user_id = '<user_id_du_compte_test>'
ORDER BY created_at DESC LIMIT 5;
```
Attendu : ligne `Coop / 42 / food / one_time / manual` (ou `coach`)

### 2. Multi-create (3 dépenses)
```sql
SELECT COUNT(*) FROM expenses WHERE user_id = '<uid>' AND created_at > NOW() - INTERVAL '5 minutes';
```
Attendu : 3

### 3. Créer revenu
```sql
SELECT id, label, amount, category, frequency FROM incomes WHERE user_id = '<uid>' ORDER BY created_at DESC LIMIT 3;
```
Attendu : `prime / 800 / one_time`

### 4-5. Budget + Objectif
```sql
SELECT category, monthly_limit FROM category_budgets WHERE user_id = '<uid>';
SELECT title, target_amount, current_amount, deadline, is_completed FROM goals WHERE user_id = '<uid>';
```

### 6-9. Modifications
```sql
-- Après update Coop à 45
SELECT amount FROM expenses WHERE user_id = '<uid>' AND label = 'Coop' ORDER BY created_at DESC LIMIT 1;
-- Attendu: 45
```

### 10-13. Suppressions
```sql
-- Après suppression Coop
SELECT COUNT(*) FROM expenses WHERE user_id = '<uid>' AND label = 'Coop';
-- Attendu: 0
```

### 14-15. Mémoire
```sql
SELECT kind, summary, archived_at FROM user_memory_entries WHERE user_id = '<uid>' ORDER BY created_at DESC;
```
Après suppression : `archived_at IS NOT NULL` pour la note moto

### 16. Plan step
```sql
SELECT title, is_completed, completed_at FROM financial_plan_steps WHERE user_id = '<uid>';
```

---

## Tests de revalidation cibles

Après chaque action, vérifier que la page cible affiche la nouvelle donnée SANS hard refresh :

| Action | Page à recharger | Vérifier |
|---|---|---|
| Dépense add/update/delete | `/design-match/depenses-v3` | ligne présente/modifiée/absente |
| Revenu add/update/delete | `/design-match/revenus-v3` | ligne présente/modifiée/absente |
| Budget add/update/delete | `/design-match/budget-v3` | cap visible/modifié/absent |
| Objectif add/update/delete | `/design-match/objectifs-v3` | tile présente/modifiée/absente |
| Mémoire add/delete | `/settings/memory` | note présente/archivée |
| Plan step toggle | `/design-match/plan-v3` | checkbox cochée/décochée |
| Toute action | `/design-match/dashboard-v3` | KPIs recalculés |
| Toute action | `/coach` | contexte mis à jour pour Iris (vérifiable en demandant `résume ma situation` après) |

---

## Cas spéciaux à tester séparément

### Désambiguïsation expense/income
1. Créer 3 lignes "Assurance" différentes (auto, maladie, ménage)
2. Taper : `supprime ma dépense assurance`
3. **Attendu** : Iris répond demande de précision avec les 3 candidats listés (le coach reformule ; pas de tool appelé tant que pas précisé)
4. Préciser : `supprime celle de l'auto`
5. Attendu : carte de confirmation suppression Assurance auto

### Désambiguïsation memory
1. Créer 2 mémoires similaires : "veut moto 2027" et "veut moto BMW spécifiquement"
2. Taper : `oublie ma note moto`
3. **Attendu** : Iris demande précision

### No-op rejected
1. Taper : `change mon objectif maison` (sans nouveau montant ni nouvelle deadline)
2. **Attendu** : Iris demande quelle propriété changer (le parser rejette le tool no-op)

### Confirmation obligatoire
1. Taper : `supprime mon objectif voyage Japon`
2. **Attendu** : carte ROUGE de confirmation visible
3. NE PAS cliquer "Confirmer" → ouvrir Supabase → l'objectif doit toujours être là
4. Cliquer "Confirmer" → l'objectif est supprimé

### Échec attendu (à reproduire en NO-GO)
1. Taper : `supprime mon objectif licorne` (n'existe pas)
2. **Attendu** : Iris répond message d'erreur localisé "Aucun objectif ne correspond"
3. PAS de crash, PAS de toast rouge système

---

## Rapport à remplir et m'envoyer

À la fin de la session, créer un fichier markdown avec :

```markdown
# IRIS REAL VALIDATION — Résultat preview YYYY-MM-DD

| # | Action | Statut | Cause (si KO) | Action correctrice |
|---|---|---|---|---|
| 1 | Créer dépense | ✅/⚠️/❌ | ... | ... |
| ... | ... | ... | ... | ... |

## Cas spéciaux
- Désambiguïsation expense : ✅/⚠️/❌
- Désambiguïsation memory : ✅/⚠️/❌
- No-op rejected : ✅/⚠️/❌
- Confirmation obligatoire : ✅/⚠️/❌
- Erreur "non trouvé" : ✅/⚠️/❌

## Bugs trouvés
1. ...
2. ...

## Conclusion
Score actions Iris : X/16
```

Renvoie-moi ce rapport — je corrige les ❌ et ⚠️ immédiatement.
