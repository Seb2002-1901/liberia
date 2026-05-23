# Sécurité — LIBERIA

> Phase 1 : posture sérieuse, sans sur-ingénierie. Toutes les pratiques
> ci-dessous sont effectives dans le code.

## Authentification

- **Supabase Auth** avec cookies HTTP-only.
- Session rafraîchie dans `middleware.ts` à chaque requête (sauf assets statiques).
- Routes protégées (`/dashboard`, `/budget`, `/incomes`, `/expenses`, `/goals`,
  `/profile`, `/settings`, `/onboarding`) : utilisateur non connecté → redirection
  `/login?next=...`.
- Routes d'auth (`/login`, `/register`, `/forgot-password`, `/reset-password`) :
  utilisateur connecté → redirection `/dashboard`.

## Row-Level Security (Postgres)

Toutes les tables métier ont RLS **activée**. Les policies forcent
`auth.uid() = user_id` (ou `auth.uid() = id` pour `profiles`).

Tables que l'utilisateur possède et édite :
`profiles`, `financial_profiles`, `incomes`, `expenses`, `goals`,
`user_settings` — policies `select`, `insert`, `update`, `delete` self.

Table en **lecture seule côté utilisateur** : `subscriptions`. Toutes les
écritures passent par :
- le trigger `handle_new_user` (SECURITY DEFINER) qui seed le plan free
  à l'inscription ;
- le webhook Stripe (Phase 2, client `service_role` qui bypass RLS).

Cela ferme le bypass "fake Premium" qui aurait sinon été possible via
`supabase.from('subscriptions').update({plan: 'premium'})` depuis la
console du navigateur.

Trigger BEFORE INSERT/UPDATE sur `goals` qui dérive `is_completed` à
partir de `current_amount >= target_amount` — empêche un utilisateur de
"compléter" un objectif via le SDK pour libérer un slot sous la limite
Free 1 objectif actif.

Aucune route ou requête ne peut contourner ces règles, même si le code
applicatif est compromis.

## Validations

- Tous les inputs traversent **Zod** côté client (formulaires) ET côté
  server actions (re-validation systématique avant l'écriture Postgres).
- Schémas : `lib/validations/auth.ts`, `lib/validations/finance.ts`.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` et `STRIPE_SECRET_KEY` ne sont **jamais**
  préfixés `NEXT_PUBLIC_` : ils restent côté serveur.
- `lib/stripe/server.ts` importe `"server-only"` — toute tentative de
  l'importer côté client lève une erreur de build.

## Stripe

- Le webhook (`/api/stripe/webhook`) **vérifie la signature** via
  `stripe.webhooks.constructEvent` avant tout traitement.
- Aucune écriture base sans signature valide.

## Anti-énumération

- Le flow "mot de passe oublié" répond toujours par un succès générique
  (Supabase Auth, qui ne révèle pas si l'email existe).

## Disclaimer légal

- Aucune information dans l'app n'est présentée comme un conseil financier.
- La page `/legal` rappelle explicitement l'absence de conseil et la
  responsabilité de l'utilisateur.

## À renforcer en prod

- Rate limiting applicatif (Upstash, ou edge middleware) sur `/api/stripe/*`
  et endpoints sensibles. Hook prêt à brancher dans `middleware.ts`.
- Monitoring d'erreurs (Sentry, BetterStack).
- Email transactionnels via un provider audité (Resend, Postmark).
