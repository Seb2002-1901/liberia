# Tests — Phase 3

LIBERIA est couvert par deux suites :

- **Vitest** (unitaires) — `tests/unit/**/*.test.ts`
- **Playwright** (E2E smoke) — `tests/e2e/**/*.spec.ts`

## Scripts

```bash
npm run test         # vitest run (CI mode)
npm run test:watch   # vitest watch
npm run test:e2e     # playwright test (boots `next dev` auto)
```

## Vitest

- Couvre la logique financière déterministe (`lib/calculations/*`), le
  schéma Zod du plan (`lib/ai/plan-schema.ts`), et `safeRedirectPath`.
- 34 tests passants au moment de la livraison Phase 3.
- Pas de mocks Supabase / Anthropic / Stripe — ces couches sont
  vérifiées par les audits + tests E2E.

Ajouter un test : crée un fichier `tests/unit/<sujet>.test.ts`,
importe via le path-alias `@/`. Pas de setup global requis.

## Playwright

- Smoke test : visite `/`, `/pricing`, `/demo`, `/login`, `/register`,
  `/legal`, `/privacy`, `/terms` et `/dashboard`. Vérifie un texte
  ancre visible sur chaque.
- `playwright.config.ts` boot `next dev` automatiquement sauf si
  `PLAYWRIGHT_BASE_URL` est défini (utile en CI / preview).
- 1 projet par défaut : Chromium desktop. Ajouter mobile/Firefox en
  modifiant `projects[]`.

Installation locale :

```bash
npx playwright install chromium
npm run test:e2e
```

Le `webServer` boot automatique implique que `npm run dev` doit pouvoir
démarrer (donc deps installées + Node 22).

## CI — GitHub Actions

`.github/workflows/ci.yml` :

- **Job `static`** : typecheck → lint → vitest → build.
- **Job `e2e`** : installe Chromium + Playwright, lance la suite e2e,
  upload le report en artifact (7 jours de rétention).

Le workflow tourne sur `push main` et chaque PR. `forbidOnly: true` en CI
empêche le merge d'un `test.only` oublié.

## Couverture actuelle

| Couche | Couverture |
|--------|------------|
| Logique financière | Unitaires (Vitest) — 14 tests |
| Schéma plan IA | Unitaires (Vitest) — 5 tests |
| Safe redirect | Unitaires (Vitest) — 8 tests |
| Pages publiques | Smoke E2E (Playwright) — 8 routes |
| Auth flow | Smoke E2E partiel — /dashboard fallback démo |
| Stripe checkout / webhook | ❌ Pas encore — requiert Stripe test mode + fixtures Supabase |
| Coach IA / streaming | ❌ Pas encore — requiert Anthropic + fixtures |
| Plan IA génération | ❌ Pas encore — requiert Anthropic + service-role |

Les couches manquantes sont volontairement non-couvertes en Phase 3
faute de fixtures (Stripe + Anthropic + Supabase service-role en CI).
Elles seront ajoutées quand on aura un environnement de staging
dédié avec ses propres secrets.
