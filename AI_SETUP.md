# Coach IA — Setup

Le coach IA LIBERIA (`/coach`) tourne sur l'API Anthropic, modèle **Claude
Sonnet 4.6** par défaut, avec prompt caching activé sur le system prompt +
contexte financier.

## 1. Obtenir une clé Anthropic

1. [console.anthropic.com](https://console.anthropic.com) → **Get API keys**.
2. Crée une clé `sk-ant-...` et copie-la.
3. Renseigne dans `.env.local` :

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

Sans cette variable :
- `/coach` reste accessible mais le formulaire de chat est désactivé avec un
  message clair "non configuré" ;
- `/api/ai/chat` renvoie `501` ;
- aucune dépendance ne casse, le reste de l'app fonctionne normalement.

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` est aussi requis** pour le coach.
> La RLS sur `ai_messages` n'autorise les inserts user-session que pour
> `role='user'` — ferme la faille où un utilisateur pourrait forger des
> messages assistant dans son propre historique et empoisonner la
> conversation suivante. Les écritures assistant passent par le client
> service-role. Sans cette variable, `/api/ai/chat` retourne 501.

## 2. Migrer la base de données

Exécute `supabase/schema.sql` (il est idempotent). Les nouvelles tables Phase 2 :

- `ai_conversations` — métadonnées des conversations (RLS self CRUD).
- `ai_messages` — messages utilisateur et assistant + comptes de tokens (RLS self).
- `stripe_events` — ledger d'idempotence webhook (RLS no-user access).

## 3. Modèle et options

Configurés dans [`lib/ai/client.ts`](./lib/ai/client.ts) :

```ts
export const COACH_MODEL = "claude-sonnet-4-6";
export const COACH_MAX_TOKENS = 2048;
```

Le coach utilise :
- **adaptive thinking** (`thinking: {type: "adaptive"}`) — Claude décide quand penser ;
- **prompt caching** sur le block system + contexte financier ;
- **streaming SSE** côté serveur, lu par le client via `ReadableStream`.

## 4. System prompt

Défini dans [`lib/ai/prompts.ts`](./lib/ai/prompts.ts). Garde-fous appliqués :

- Pas de conseil financier réglementé (allocations, achat de titres, crypto, ...).
- Pas de promesse de rendement.
- Recadre vers un professionnel agréé quand la question dérive.
- Ton calme, jamais culpabilisant, jamais d'emojis.

## 5. Contexte financier injecté

Voir [`lib/ai/context.ts`](./lib/ai/context.ts). À chaque appel, on construit un
bloc markdown stable et déterministe avec :

- revenus / dépenses mensuels normalisés
- reste à vivre, taux d'épargne, runway, score stabilité
- top 8 catégories de dépenses
- objectifs en cours

Le bloc est inclus dans le `system[]` après le prompt fixe, avec
`cache_control: { type: "ephemeral" }`. Le cache se réchauffe automatiquement
au-dessus de ~2048 tokens (minimum Sonnet 4.6) — sinon il no-op silencieusement.

## 6. Sécurité

- Tous les inputs passent par Zod (`lib/ai/safety.ts`).
- Anti prompt-injection basique (`looksLikeAbuse`) — défense en profondeur.
- Rate-limit Upstash 30 req/min/user sur `/api/ai/chat` (no-op si Upstash absent).
- Conversations + messages protégés par RLS self-only.

## 7. Tester localement

1. Ajoute `ANTHROPIC_API_KEY` à `.env.local`.
2. `npm run dev`.
3. Crée un compte, complète l'onboarding.
4. Va sur **/coach** → "Démarrer une conversation".
5. Pose une question concrète : "Comment économiser 100 € ce mois-ci ?".

Tu devrais voir la réponse arriver en streaming, avec les chiffres tirés de
ta vraie situation financière.

## 8. Coût et caching

- Sonnet 4.6 : `$3 / 1M` input, `$15 / 1M` output.
- Cache read : ~0.1× input — ~90% d'économie sur le prefix répété entre messages.
- Une conversation typique de 5-10 tours coûte ~0.01-0.03 €.
- Vérifie le cache via `usage.cache_read_input_tokens` (logué en base dans
  `ai_messages.cache_read_tokens`).

## 9. Roadmap

- Plan 90 jours généré via Anthropic tool-use (structured JSON).
- Notifications hebdo par email (récap + nudge généré par le coach).
- Conversations partageables / export markdown.
