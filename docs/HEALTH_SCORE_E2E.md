# Phase 3.2 — Financial Health Score : test plan E2E manuel

> Checklist de validation visuelle et fonctionnelle à parcourir avant
> chaque release qui touche au FHS. À compléter dans un staging
> branché sur une base Supabase de test. Tous les scénarios ci-dessous
> sont déterministes — les nombres dépendent uniquement des données
> seedées.

---

## Pré-requis

- App déployée (staging ou local `pnpm dev`)
- Migration `20260606_health_snapshots.sql` appliquée
- Accès admin à Supabase pour seeder/inspect les tables
  `health_snapshots`, `health_score_deltas`
- Deux comptes de test : **A** (vide) et **B** (provisionné)
- Variable `SUPABASE_SERVICE_ROLE_KEY` configurée (nécessaire pour
  l'écriture des snapshots)

---

## Scénario 1 — Nouveau compte (jour J0)

**Objectif** : la première visite affiche un score INSUFFICIENT_DATA
sans crasher, sans message accusatoire.

### Setup
- Compte A fraîchement créé, aucune donnée financière.

### Étapes
1. Se connecter avec le compte A.
2. Ouvrir `/dashboard`.
3. Observer l'anneau Health Score :
   - [ ] Le score est affiché (peut être 0 à 18 selon l'onboarding)
   - [ ] L'anneau est en couleur **NEUTRE** (muted), PAS rose
   - [ ] Badge "Insuf." en bas-droit visible
   - [ ] Pas de delta affiché (pas de tirets ni de chiffres)
4. Cliquer sur l'anneau pour ouvrir le drawer.
   - [ ] La modal s'ouvre proprement
   - [ ] Le bouton fermer (X) est visible en haut-droite
   - [ ] Le titre "Mon score de santé financière" apparaît
   - [ ] Le chip "Données insuffisantes" apparaît
   - [ ] Le bloc "Pourquoi mon score a changé" affiche "Bienvenue
         sur ton score. Reviens dimanche pour ton premier delta."
   - [ ] La décomposition par axe est visible mais barres muted
   - [ ] Pas de bloc Recommandation (recommendation = null)
   - [ ] Un message d'aide neutre type "Ton profil est encore en
         construction" apparaît
5. Fermer la modal (ESC, X, ou click-outside).
   - [ ] Tous trois fonctionnent

### Vérif Supabase
```sql
select user_id, week, confidence, display_score
from public.health_snapshots
where user_id = '<A_USER_ID>'
order by week desc limit 1;
```
- [ ] Une ligne existe pour la semaine en cours (si on est après
      dimanche 23h locale)
- [ ] `confidence = 'INSUFFICIENT_DATA'`
- [ ] `display_score` ≥ 0 et ≤ 100

---

## Scénario 2 — Utilisateur existant avec snapshot (jour J7+)

**Objectif** : un retour 7 jours plus tard montre un delta hebdomadaire
correct, avec contributeurs et momentum quand applicable.

### Setup
- Compte B : profil complet (revenus, ≥ 4 catégories de dépenses
  fixes, current_savings renseigné, ≥ 1 budget, ≥ 1 goal actif).
- Snapshot précédent existe (week W-1).

### Étapes
1. Se connecter avec le compte B.
2. Ouvrir `/dashboard`.
3. Observer l'anneau :
   - [ ] Le score affiché correspond au snapshot scellé
   - [ ] L'anneau est en couleur **band-coloré** (vert pour Or, etc.)
   - [ ] Un chip delta sous le score : `+N` vert, `−N` rose ou `—`
   - [ ] Pas de badge confiance (HIGH)
4. Cliquer pour ouvrir le drawer.
   - [ ] Header : score (5xl) + badge band ("Solide", "En construction"…)
   - [ ] Chip confidence ("Confiance élevée")
   - [ ] Si momentum disponible : chip "↗ Progression marquée sur 4 sem."
   - [ ] Bloc "Pourquoi mon score a changé" :
     - 1 à 3 contributeurs cités avec chips +/−
     - Texte ICU correctement rendu avec valeurs payload
     - Footer "Gain net : +N" / "Perte nette : −N" / "Score stable"
   - [ ] Décomposition 6 axes en ordre canonique :
     - Discipline → Résilience → Trajectoire → Couverture → Objectifs → Comportement
     - Confidence chip si != HIGH
   - [ ] Bloc Recommandation visible avec :
     - Titre + description (chiffres réels)
     - Si applicable : "≈ +N points si tu agis cette semaine"
     - Bouton "Parler à mon conseiller" → redirige /coach

### Vérif Supabase
```sql
select week, display_score, previous_score, band, previous_band
from public.health_snapshots
where user_id = '<B_USER_ID>'
order by week desc limit 2;

select week_to, week_from, net_delta, contributors
from public.health_score_deltas
where user_id = '<B_USER_ID>'
order by week_to desc limit 1;
```
- [ ] Deux snapshots (semaine courante + précédente)
- [ ] `previous_score` du snapshot courant = `display_score` du précédent
- [ ] Un delta existe pour `week_to` = semaine courante
- [ ] `net_delta` correspond au chip delta affiché dans le ring
- [ ] `contributors` est un JSON array de 1-5 objets avec axis,
      deltaPoints, reasonKey, payload

---

## Scénario 3 — Confiance INSUFFICIENT_DATA persistante

**Objectif** : le coach refuse toute conclusion forte tant que les
données restent insuffisantes.

### Setup
- Compte B mais avec `financialProfile.monthly_income` mis à NULL
  (simuler une régression structurelle).

### Étapes
1. Recharger `/dashboard`.
2. Vérifier le ring :
   - [ ] Confidence affichée = "Insuf."
   - [ ] Couleur de l'anneau = neutre
3. Ouvrir le drawer.
   - [ ] Chip "Données insuffisantes" présent (pas rose, NEUTRE)
   - [ ] Message d'aide en pied : "Ton profil est encore en
         construction. Complète tes revenus, dépenses fixes et au
         moins deux catégories majeures..."
   - [ ] Bloc Recommandation **absent** (recommendation = null sur
         INSUFFICIENT_DATA)
4. Ouvrir le coach `/coach`.
5. Poser la question "Mon score est à quoi ?" ou similaire.
   - [ ] Le coach NE conclut PAS sur le score
   - [ ] Le coach pose UNE question pour débloquer (par exemple :
         "Tu peux me dire ton revenu mensuel net ?")
   - [ ] Le coach mentionne "Données insuffisantes" si le ton de
         la conversation l'appelle

### Vérif côté contexte coach
- Ouvrir la session de debug si dispo, ou loguer le `financeContext`
- [ ] La section "# Financial Health Score" est présente
- [ ] La ligne "Confiance : Données insuffisantes" apparaît
- [ ] La ligne "Lecture provisoire : ne pas tirer de conclusion forte..."
      est présente

---

## Scénario 4 — Compte démo

**Objectif** : le compte démo affiche un score réaliste avec badge
DEMO partout.

### Setup
- Aucun compte authentifié OU mode `!isSupabaseConfigured()`.
- L'app sert les données démo.

### Étapes
1. Ouvrir `/dashboard` en mode démo.
2. Observer le ring :
   - [ ] Le score est affiché avec un nombre réaliste (typiquement
         haut, Or ou Émeraude)
   - [ ] Badge **DÉMO** doré en haut-droite du ring
3. Ouvrir le drawer.
   - [ ] Badge **DÉMO** également visible en haut-droite de la modal
   - [ ] Pas de confusion avec un vrai score

### Note
En mode strictement non-authentifié, le ring peut être absent (pas
d'userId pour appeler le writer). Vérifier que le dashboard rend
malgré tout sans crash.

---

## Scénario 5 — Coach demande "pourquoi mon score est à X ?"

**Objectif** : le coach répond avec un texte qui s'appuie EXACTEMENT
sur les données du contexte (score, contributeurs, recommandation).

### Setup
- Compte B avec snapshot + delta de la semaine.

### Étapes
1. Ouvrir `/coach`.
2. Poser exactement : "Pourquoi mon score est à {valeur_affichée} ?"
3. Vérifier la réponse :
   - [ ] Le coach cite le score EXACT (le même que le ring affiche)
   - [ ] Le coach mentionne les principaux contributeurs (issus du
         delta engine, donc déterministes)
   - [ ] Le coach mentionne au moins un axe par son nom canonique
         (Discipline / Résilience / Trajectoire / Couverture /
         Objectifs / Comportement)
   - [ ] Le coach NE dit PAS "bon" ou "mauvais" sans qualifier
         immédiatement (axe faible / contexte)
   - [ ] Si bande rose : ton empathique en première phrase
   - [ ] Si bande émeraude : ton anticipatif, ouvert sur long terme
   - [ ] La recommandation citée correspond ou est cohérente avec
         celle du drawer

---

## A11y — checklist transverse

### Ring
- [ ] Tab focus visible (ring doré 2px)
- [ ] Espace / Entrée déclenche l'ouverture du drawer
- [ ] `aria-label` lu par VoiceOver contient : score + bande + delta
      (s'il y en a un) + confidence (si pas HIGH) + démo (si applicable)
- [ ] Badges décoratifs (delta chip, DEMO, confidence) ont
      `aria-hidden="true"` — pas de double annonce

### Drawer
- [ ] Ouverture via clic + via Espace/Entrée depuis le ring
- [ ] Focus piégé dans la modal (Radix le gère)
- [ ] ESC ferme
- [ ] Click sur overlay ferme
- [ ] Bouton X visible en haut-droite (Radix sr-only "Fermer")
- [ ] DialogTitle = "Mon score de santé financière" annoncé
- [ ] DialogDescription (sr-only) = "Score actuel X sur 100, bande Y,
      confiance Z" annoncé après le titre
- [ ] Bouton toggle "Décomposition" a `aria-expanded` et `aria-controls`
- [ ] CTA "Parler à mon conseiller" navigable au clavier

---

## Responsive — checklist mobile

À tester sur tailles : **320px**, **375px**, **430px** (DevTools
device toolbar).

### Dashboard
- [ ] Ring + AdvisorCard empilés en colonne sur mobile (sm: rangée)
- [ ] Ring 80×80 ne déborde pas
- [ ] AdvisorCard prend la largeur restante
- [ ] Pas de scroll horizontal

### Drawer
- [ ] La modal occupe ~90vh sur mobile (scroll interne si débordement)
- [ ] Le score 5xl + badge band wrap correctement si écran étroit
- [ ] Le chip momentum wrap si trop long
- [ ] Les axes rows : label / chips alignés sans casse
- [ ] Bouton "Décomposition" cliquable même avec gros doigts
- [ ] Bouton "Parler à mon conseiller" accessible en bas

---

## Final checks avant merge

- [ ] `pnpm exec tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` — toutes les suites vertes
- [ ] `pnpm build` succès
- [ ] Snapshot SQL smoke réussi (cf. `supabase/sql_smoke/health_snapshots.sql`)
- [ ] Aucun warning console lors de l'ouverture / fermeture du drawer
- [ ] Aucun log d'erreur Supabase dans les routes server-side

---

## Suivi des résultats

| Date | Tester | Compte | Scénario | Status | Notes |
|------|--------|--------|----------|--------|-------|
|      |        |        |          |        |       |
