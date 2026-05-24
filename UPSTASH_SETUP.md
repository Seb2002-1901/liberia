# Upstash Redis — Rate limiting

LIBERIA utilise `@upstash/ratelimit` pour protéger les endpoints sensibles.
Le limiter no-op (autorise tout) si Upstash n'est pas configuré — utile en dev.

## 1. Créer la base

1. [console.upstash.com](https://console.upstash.com) → **Create Database** →
   Redis → choisir une région proche de Vercel (eu-west-1 / us-east-1).
2. Onglet **REST** → copier l'URL et le token.

## 2. Variables d'env

```
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=AaA...
```

## 3. Fenêtres configurées

Dans `lib/rate-limit.ts` :

| Clé      | Endpoint                         | Tokens / fenêtre |
|----------|----------------------------------|------------------|
| `stripe` | `/api/stripe/checkout`, `/portal` | 10 / minute      |
| `ai`     | `/api/ai/chat`                   | 30 / minute      |
| `auth`   | (réservé Phase 3)                | 8 / minute       |

L'identifiant utilisé est `user.id` (Supabase). Pour les endpoints non
authentifiés (Phase 3), passe à l'IP via `request.headers.get("x-forwarded-for")`
ou un fingerprint client.

## 4. Comportement quand limite atteinte

L'endpoint renvoie **429** avec un message court en français. Le client
affiche un toast et l'utilisateur peut réessayer après la fenêtre.

## 5. Désactivation

Retire les deux env vars. Le helper retourne `success: true` immédiatement —
les limites ne sont plus enforced. À garder en dev / preview seulement.

## 6. Coût

Plan **Free** Upstash : 10 000 commandes/jour. Largement suffisant pour
plusieurs centaines d'utilisateurs actifs en Phase 2.
