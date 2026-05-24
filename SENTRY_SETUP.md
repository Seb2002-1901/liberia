# Sentry — Setup

LIBERIA intègre `@sentry/nextjs`. Le SDK no-op si `SENTRY_DSN` est absent —
aucune dépendance dure.

## 1. Créer le projet

1. [sentry.io](https://sentry.io) → **Create Project** → **Next.js**.
2. Copie le DSN au format `https://<key>@<org>.ingest.sentry.io/<project>`.

## 2. Variables d'env

```
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

Les deux sont utiles :
- `SENTRY_DSN` (server-only) — capture serveur, middleware, server actions.
- `NEXT_PUBLIC_SENTRY_DSN` — capture client-side (errors React, fetch).

Tu peux mettre la même valeur dans les deux.

## 3. Configuration

3 fichiers à la racine du projet :

- `sentry.server.config.ts` — runtime Node.js.
- `sentry.client.config.ts` — bundle client.
- `sentry.edge.config.ts` — edge runtime (middleware).

Tous les trois :
- ne s'activent que si le DSN est présent ;
- `sendDefaultPii: false` ;
- `beforeSend` strip `Authorization`, `Cookie`, et l'objet `user` pour ne
  jamais logger d'email, de montant, ou de token.

Le fichier `instrumentation.ts` à la racine wire automatiquement Sentry au
démarrage Next.js, et expose `onRequestError` pour capturer les erreurs de
route handlers.

## 4. Ce qui est filtré côté code

- Pas de logs d'`email`, `amount`, `stripe_customer_id`, `access_token`.
- Pas de stacktraces qui contiennent un body de requête JSON.
- Le webhook Stripe et l'endpoint `/api/ai/chat` ne loggent jamais le payload.

## 5. Tester

```bash
# server-side error capture
curl http://localhost:3000/api/stripe/checkout -X POST \
  -H 'Content-Type: application/json' -d '{"planId":"invalid"}'
```

Sentry doit recevoir un event 400. Vérifie qu'aucune donnée sensible n'est
dans le payload.

## 6. Tracing

`tracesSampleRate: 0.1` en production (10% des requêtes). Met `1.0` en preview
si tu veux profiler tous les endpoints.

## 7. Désactivation

Pour désactiver Sentry sans toucher au code : retire les deux DSN du `.env`.
L'app continue de tourner normalement.
