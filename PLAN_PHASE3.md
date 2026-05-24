# Plan 90 jours IA — Phase 3

Le coach LIBERIA peut maintenant générer un **plan financier structuré** sur
30, 60 ou 90 jours via Anthropic tool-use, basé sur les vraies données de
l'utilisateur.

## Flow technique

1. L'utilisateur ouvre `/plan` → page server-side, lit `getActivePlan()`.
2. S'il n'y a pas de plan actif, bouton "Générer mon plan" → ouvre un Dialog
   avec choix d'horizon (30/60/90 jours).
3. Click "Lancer" → server action `generateFinancialPlan(input)` :
   - Vérifie auth + Anthropic + service-role configurés.
   - Vérifie rate-limit (30/min/user, partagé avec /api/ai/chat).
   - Build le contexte financier via `buildFinanceContext(financeData)`.
   - Appelle `generatePlan({ horizonDays, financeContext, model })` qui :
     - Pose un message system long + le contexte financier.
     - Force Claude à appeler **EXACTEMENT UNE FOIS** un outil
       `submit_plan` avec un input_schema strict (JSON Schema mirror
       de `planSchema`).
     - Récupère le `tool_use` block, valide via Zod (defense en profondeur).
   - Désactive les plans précédents (`is_active=false`).
   - Insère `financial_plans` (avec snapshot du contexte pour audit) +
     `financial_plan_steps`.
   - Revalide `/plan` et `/dashboard`.

## Garde-fous IA

Le system prompt (voir `lib/ai/plan-generator.ts` — `PLAN_SYSTEM_PROMPT`)
hérite du `COACH_SYSTEM_PROMPT` et ajoute des règles strictes :

- 3 à 40 étapes max, réparties sur l'horizon (30j→4 semaines, 60j→9, 90j→13).
- Chaque action commence par un verbe + cite un MONTANT ou DÉLAI réel du contexte.
- Pas de promesses de richesse. Pas de conseil d'investissement réglementé.
- Revenus potentiels réalistes seulement (jamais crypto/trading/MLM).
- Étapes au-delà de l'horizon sont silencieusement filtrées côté serveur.

## Schéma DB

```
financial_plans
  id uuid pk
  user_id uuid fk auth.users on delete cascade
  horizon_days integer (30 | 60 | 90)
  title text
  summary text
  model text
  generation_input jsonb       -- preview contexte + tokens (audit)
  is_active boolean
  generated_at timestamptz
  created_at / updated_at

financial_plan_steps
  id uuid pk
  plan_id uuid fk financial_plans on delete cascade
  user_id uuid fk auth.users on delete cascade
  week_number int (1..13)
  focus text
  title text
  description text
  expected_impact_eur numeric(12,2)
  category text (reduce_expense | build_emergency | debt_payoff |
                 automate_saving | habit | income_boost | review | other)
  is_completed bool
  completed_at timestamptz
  position int
```

RLS : self CRUD sur les deux tables. Les steps héritent du `user_id` du
plan via insertion explicite côté action (vérifiée côté Zod, doublement
gardée par RLS).

## UI

- `/plan` → `PlanProgress` (header + barre progression) + `PlanTimeline`
  (groupé par semaine).
- `PlanStepItem` → bouton check optimiste + categories iconées + impact
  estimé en €/mois affiché si fourni.
- `PlanGenerateButton` → Dialog avec horizon picker, loading state, toast
  succès/erreur, refresh router.
- Toggle d'étape → `toggleStep(stepId, isCompleted)` server action
  (revalide /plan + /dashboard).
- Widget `/dashboard` → `PlanTeaser` montre le prochain step ou CTA
  "Générer mon plan".

## Coûts

- Sonnet 4.6, ~3000-6000 tokens input + ~2000-4000 tokens output =
  ~$0.05-0.10 par génération.
- Limité à 30 req/min/user via le rate-limit IA partagé.
- Génération lente (10-30s) — `maxDuration=60` sur l'action côté serveur
  est implicite via Next 15.

## Tester

1. Crée un compte, complète l'onboarding avec des données réalistes.
2. Va sur `/plan` → "Générer mon plan".
3. Attends 10-30s → le plan apparaît, timeline par semaine.
4. Coche / décoche les étapes → progression DB mise à jour.
5. Régénère → l'ancien plan est désactivé, le nouveau prend la place.

## Roadmap

- Pouvoir revoir un ancien plan (archive).
- Comparer plans entre eux.
- Streaming de la génération (tool-use streamé).
- Tool-use multi-étapes : un "rebuild plan from progress" qui adapte le
  reste du plan en fonction des steps validés.
