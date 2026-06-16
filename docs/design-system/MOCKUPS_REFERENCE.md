# LIBERIA — Référence Design Phase 5.0

> **Source de vérité visuelle officielle du produit.**
>
> Document à consulter avant toute évolution UI. Les 12 maquettes
> versionnées dans `./mockups/` représentent l'état cible validé
> par le fondateur (juin 2026). Toute divergence avec ces maquettes
> doit être considérée comme un bug.

---

## Règle de tri officielle (validée fondateur)

Quand maquette et règles MVP divergent :

- **Visuel maquette** → reste la référence : disposition, hiérarchie,
  espacements, composants, niveau premium.
- **Règles MVP** → définissent le contenu autorisé : suppression ou
  remplacement des blocs visuels qui contiennent du contenu interdit.

En cas de conflit : structure visuelle préservée, contenu remplacé
par un équivalent éducatif/neutre conforme.

---

## Identité produit

LIBERIA est :
- un coach financier IA
- un planificateur financier personnel
- un accompagnateur de progression financière

LIBERIA n'est PAS :
- un logiciel bancaire
- un outil de trading
- une plateforme crypto
- un logiciel de comptabilité
- une app de budget (YNAB / Wallet / Money Manager)

L'utilisateur doit avoir le sentiment qu'un conseiller personnel
l'accompagne quotidiennement. Chaque écran doit lui montrer :
- où il en est
- ce qu'il doit faire
- pourquoi il doit le faire
- ce qu'il peut gagner

---

## Les 4 piliers du produit

| Pilier | Surface principale | Surfaces secondaires |
|---|---|---|
| **Coach IA** | Page Coach IA (chat structuré CONSTAT/POURQUOI/ACTION/IMPACT/PROCHAINE) | Bloc conseil + CTA "Parler à mon conseiller" sur chaque page |
| **Plan d'action** | Page Plan (roadmap 4 étapes : Sécuriser / Optimiser / Accélérer / Investir) | Mission du moment sur dashboard |
| **Opportunités** | Page Opportunités (catalogue classé effort / risque / délai) | Bloc "Opportunités du moment" sur Revenus, Investissements, Dashboard |
| **Simulations** | Simulateurs dans Épargne / Investissements / Objectifs / Budget | Projections sur Plan, Dashboard |

---

## Design system transversal

### Palette (validée maquette)
| Token | Hex | Usage |
|---|---|---|
| `--background` | `#F6F8FC` | Fond app global |
| `--card` | `#FFFFFF` | Surface des cartes |
| `--foreground` | `#0F172A` | Texte principal |
| `--muted-foreground` | `#64748B` | Texte secondaire, captions |
| `--primary` | `#2563EB` | CTAs, liens, focus ring |
| `--navy` | `#0F3D9E` | Carte hero bleu marine, wordmark |
| `--success` | `#16A34A` | Gains, progressions, deltas positifs |
| `--warning` | `#F59E0B` | Alertes douces |
| `--destructive` | `#DC2626` | Alertes critiques uniquement |
| `--border` | `#E2E8F0` | Hairlines subtiles |

### Inspirations
Apple — Stripe — Linear — Notion — Mercury — Arc Browser — Perplexity

### Interdits formels
- Dark mode / thème noir / thème or
- Glassmorphism agressif
- Néon / cyberpunk
- Gradients criards
- Ombres profondes

### Rayons & ombres
- Cartes : `rounded-2xl` (16 px) ou `rounded-[20px]` (20 px)
- Ombres : `box-shadow: 0 1px 2px 0 rgba(15,23,42,0.04)` (très subtile)
- Hairlines : `1px solid hsl(220 13% 91%)`

### Typographie
- Sans : Inter (corps, UI)
- Display : Outfit (titres, gros chiffres KPI)
- Hiérarchie : KPI 3xl bold, titres 2xl/xl semibold, body sm/base regular,
  caption uppercase tracking-wider 11px

---

## Patterns visuels invariants (chaque page applicative)

Chaque page suit la même grammaire de composition :

1. **Hero bleu marine** (`--navy`) en haut : carte large texte blanc,
   contient le KPI principal de la page (Score, Total, Restant…)
2. **Grid de 2-4 cartes blanches** : KPIs contextuels, deltas
3. **Donut chart de répartition** : sources, catégories, allocation
4. **Line chart d'évolution** : courbe temporelle simple
5. **Bloc "Conseil de votre coach IA"** : encart en bas de page
6. **CTA pied** : carte large "Parler à mon conseiller" + bouton
   "Démarrer une conversation"

Chaque page se termine TOUJOURS par le bloc coach + CTA. Le coach
n'est jamais à plus d'un clic.

Chaque page propose AU MOINS un simulateur, une mission ou une
opportunité. L'utilisateur ne sort jamais d'une page sans une
action possible.

---

## Layout global

### Sidebar fixe (gauche, ~280 px)
Fond blanc cassé. Wordmark "LIBERIA" + icône graph en haut.

Structure de navigation :

```
PRINCIPAL
  Tableau de bord
  Coach IA
  Plan d'action

FINANCES
  Revenus
  Dépenses
  Budget
  Objectifs

CROISSANCE
  Épargne
  Investissements
  Opportunités

PLUS
  Paramètres
  Profil
```

Item actif : fond accent léger, icône cerclée bleu/blanc.

En bas : carte **LIBERIA PREMIUM** (couronne dorée, "Débloquez tout
le potentiel de votre conseiller financier.", bouton "Découvrir
Premium").

### Topbar
- Salutation : "Bonjour {prénom} 👋" en gros bold
- Sous-ligne : "Voici votre situation mise à jour aujourd'hui." (ou
  équivalent contextuel)
- Côté droit : cloche notifications avec badge, avatar + nom +
  chevron

### Content area
- Fond `--background` (#F6F8FC)
- Container max-w-6xl ou 7xl, padding généreux (px-6 lg:px-10,
  py-6)
- Espacement vertical entre sections : `space-y-6` (24 px) à
  `space-y-8` (32 px)

---

## Catalogue des 12 écrans

Chaque entrée référence `./mockups/{slug}.png`.

### 1. `dashboard.png` — Tableau de bord
**Rôle** : vue d'ensemble J0, point d'entrée principal.
**Composition** :
- Bloc 1 — 3 cartes égales : Score (navy hero), Priorité actuelle, Mission du moment
- Bloc 2 — Roadmap horizontale "Votre avenir, notre feuille de route" : 4 jalons (Aujourd'hui / Dans 4 mois / Dans 12 mois / Dans 3 ans)
- Bloc 3 — 4 KPI cards : Revenus mensuels / Dépenses mensuelles / Reste à vivre / Fonds d'urgence (avec delta %)
- Bloc 4 — 3 cartes : Opportunité du moment / Répartition des dépenses (donut) / Évolution du score (line chart)
- Bloc 5 — CTA "Parler à mon conseiller" full-width

### 2. `coach.png` — Coach IA
**Rôle** : chat conversationnel structuré.
**Composition** :
- Header conversation : "Votre conseiller IA" + bouton "Nouvelle conversation"
- Zone messages : assistant en card blanche + bullets structurés
  (CONSTAT / POURQUOI / ACTION / IMPACT / PROCHAINE ÉTAPE)
- Sidebar DROITE (~280 px) : "Votre situation" (score, recap
  financier, fonds d'urgence, missions du moment, actions rapides)
- Input bas : champ texte + boutons attache/audio/envoi

### 3. `plan.png` — Plan d'action
**Rôle** : roadmap financière personnalisée.
**Composition** :
- Hero navy : Mission active "Construire votre fonds d'urgence" + progress bar + score progression
- Carte large "Votre feuille de route" : **4 étapes horizontales** (Sécuriser / Optimiser / Accélérer / Investir) avec checklist par étape
- 3 cartes bas : Projections futures (chart) / Vos prochaines actions / Augmenter vos revenus

### 4. `incomes.png` — Revenus
**Rôle** : pilotage revenus + leviers d'augmentation.
**Composition** :
- Hero navy : "25 000 CHF / revenus mensuels totaux"
- 2 cartes : potentiel d'augmentation, autre KPI
- Donut "Sources de revenu" + Line chart "Évolution des revenus"
- Détail par catégorie (table)
- Bloc "Opportunités d'augmentation" (Revenue Engine surface)
- Mission du moment + projection
- Bloc Conseil coach + CTA

### 5. `expenses.png` — Dépenses
**Rôle** : pilotage dépenses + optimisations.
**Composition** :
- Hero navy : "15 893 CHF / dépenses totales du mois"
- KPI "Économies possibles" + score amélioration potentielle
- Donut "Répartition" + Line chart "Évolution"
- Top 5 dépenses + dépenses récurrentes
- Bloc "Alertes & optimisations"
- Mission du moment + Conseil coach + CTA

### 6. `budget.png` — Budget
**Rôle** : santé du budget + suivi catégoriel.
**Composition** :
- Hero navy : "2 340 CHF / restant ce mois"
- Appels rapides (3 boutons action) + Santé budget (ring 78/100)
- Budget par catégorie (donut + liste avec progress bars)
- Line chart évolution
- Projection épargne + Répartition idéale + Alertes budgétaires
- Bloc Conseil coach + CTA

### 7. `goals.png` — Objectifs
**Rôle** : pilotage des objectifs financiers personnels.
**Composition** :
- Hero navy : "62% / objectif global"
- Compteur "4 objectifs / 6 actifs"
- Liste objectifs (cards avec photo, montant cible, progression)
- Échéances à venir (timeline)
- Line chart "Évolution votre épargne objectif"
- **Simulateur d'objectif** (Simulations pillar)
- Conseil coach + CTA

### 8. `savings.png` — Épargne
**Rôle** : pilotage épargne + planification.
**Composition** :
- Hero navy : "14 500 CHF / Total épargné"
- KPI : taux d'épargne (%), rythme mensuel
- Donut "Répartition épargne" + Line chart "Évolution"
- Objectifs d'épargne
- **Simulateur d'épargne** (Simulations pillar)
- ~~"Produits épargne recommandés"~~ → **MVP : retiré (C1)**.
  Remplacé par bloc "Conseil épargne" ou "Stratégie d'épargne
  recommandée", sans produit financier nommé.
- Conseil coach + CTA

### 9. `investments.png` — Investissements
**Rôle** : pilotage investissements + éducation.
**Composition** :
- Hero navy : "72 500 CHF / Valeur totale"
- 2 cartes : Performance (+8.7%), Revenus passifs (CHF/mois)
- Donut "Répartition" (Cash / ETF / Immobilier / Actions / Autres)
- Mes objectifs d'investissement
- **Simulateur d'investissement** (Simulations pillar)
- Comparaison de scénarios
- ~~"Opportunités ETF du moment"~~ → **MVP : retiré (C2)**.
  Remplacé par contenu éducatif : "Comprendre les ETF", "Comparer
  les scénarios", "Simuler un investissement", sans recommandation
  d'achat.
- Conseil coach + CTA

### 10. `opportunities.png` — Opportunités
**Rôle** : Revenue Engine — catalogue d'opportunités classées.
**Composition** :
- Hero navy : "12 opportunités actives"
- KPIs : "+18 750 CHF / Total gain potentiel", "72% / Taux de succès moyen"
- Liste opportunités principales (cards avec effort / temps / impact / gain)
- Opportunités par catégorie (Revenus rapides / complémentaires / patrimoniaux)
- Line chart "Analyse perfo"
- Récap saisonnier / Alertes personnalisées
- Recommandations coach + CTA

### 11. `profile.png` — Profil
**Rôle** : carte d'identité utilisateur.
**Composition** :
- Header : avatar + nom + badge Premium
- Informations personnelles (email, nom, téléphone, adresse)
- Votre profil financier (situation, revenus, dépenses, objectifs principaux)
- Préférences & objectifs
- Mes documents
- ~~Sécurité du compte avancée~~ → **MVP : simplifié (C5)**.
  Garder seulement : mot de passe, déconnexion.
- Paramètres rapides → renvoient vers /settings

### 12. `settings.png` — Paramètres
**Rôle** : préférences utilisateur.
**Composition (cible MVP, post-arbitrages)** :
- Résumé profil 76%
- ~~Préférences d'affichage avec choix de thème~~ → **MVP : retiré (C6)**.
  Light only, pas de choix.
- Informations personnelles (lien vers /profile)
- Sécurité simplifiée (mot de passe uniquement)
- Notifications (toggles simples)
- ~~Connexions bancaires (BCV / UBS / Raiffeisen)~~ →
  **MVP : retiré (C4)**. Section masquée ou "Bientôt disponible".
- Langue
- Abonnement (lien vers /settings/subscription)
- Données & confidentialité (export simple)
- À propos de LIBERIA

---

## Arbitrages MVP — règles de contenu (C1-C7)

| # | Maquette montre | Règle MVP | Action |
|---|---|---|---|
| **C1** | Produits d'épargne recommandés (page Épargne) | Pas de produit financier nommé | Remplacer par "Conseil épargne" / "Stratégie d'épargne recommandée" générique, sans nom de produit |
| **C2** | ETF / investissements recommandés (page Invest) | Pas de sélection automatique | Remplacer par contenu éducatif : "Comprendre les ETF", "Comparer les scénarios", "Simuler un investissement" |
| **C3** | Wording orienté action ("Investir dans X") | Pas de conseil réglementé | Neutraliser : ton éducatif partout. Jamais "achetez", "vendez", "investissez dans" |
| **C4** | Connexions bancaires BCV / UBS / Raiffeisen | Pas d'open banking au MVP | Retirer du Settings. Phase 2 si produit fonctionne |
| **C5** | Sécurité avancée (2FA, biométrie, signature) | Auth simple uniquement | Garder : mot de passe, sessions, déconnexion. Retirer le reste |
| **C6** | Choix de thème dans Préférences d'affichage | Light only au MVP | Retirer le sélecteur. Pas de dark mode |
| **C7** | Settings très dense (10+ sections) | Simplifier fortement | Garder : profil, email, mot de passe, langue, notifications simples, abonnement, déconnexion |

---

## Règles de développement à respecter

À chaque nouvelle page ou évolution :

1. **Se référer à la maquette** correspondante dans `./mockups/`
2. **Reproduire la structure** : hero navy → grid cartes → charts →
   bloc coach → CTA pied
3. **Filtrer le contenu** selon C1-C7 ci-dessus
4. **Vérifier la cohérence transversale** : mêmes patterns de cartes,
   même typographie, mêmes couleurs, même comportement du bloc coach
5. **Ne pas ajouter de fonctionnalité non demandée**
6. **Prioriser** : simplicité > clarté > impact utilisateur >
   complexité technique

Le coach n'est jamais à plus d'un clic. L'utilisateur ne sort
jamais d'une page sans action possible.

---

## Hors-scope MVP (validé fondateur)

Liste explicite de ce qui **ne doit PAS** apparaître au MVP :

- Sélection automatique de produits financiers
- ETF / fonds / actions recommandés nommés
- Conseil financier personnalisé réglementé
- Double authentification (2FA)
- Biométrie
- Signature électronique
- Connexion bancaire / Open Banking
- Dark mode / thème sombre
- Préférences expertes / réglages avancés
- Export de données complexe
- Suppression de compte complexe
- Trading / crypto / produits dérivés
- Comptabilité analytique
- Gestion multi-comptes / multi-foyers

Tout ce qui figure ci-dessus est explicitement **différé en Phase 2
ou ultérieur**, si et seulement si le MVP démontre sa valeur.

---

## Historique de cette référence

| Date | Évolution | Source |
|---|---|---|
| 2026-06-08 | Création du document. 12 maquettes versionnées dans `./mockups/`. Règle de tri + arbitrages C1-C7 validés. | Fondateur |
