# Sign in with Apple — Procédure d'activation

**Sprint S3** — Configuration end-to-end pour activer le bouton "Continuer avec Apple" en production.

Le code applicatif est prêt (cf. §4 ci-dessous). Cette procédure couvre la partie **configuration humaine** dans Apple Developer Portal + Supabase Dashboard.

⚠️ **Obligation App Store** : Apple Guideline 4.8 exige Sign in with Apple si l'app propose Google/Facebook SSO. Sans Apple SSO, l'app sera refusée à la review iOS.

---

## 1. Pré-requis Apple Developer

- **Apple Developer Program** actif (99 USD/an) — compte payant requis.
- **Team ID** Apple (visible dans Apple Developer > Membership).
- Un domaine personnalisé HTTPS pour LIBERIA (Sign in with Apple refuse `*.vercel.app` et `localhost`).
  - Pour la prod : `liberia.app` (ou ton domaine).
  - Pour le dev : utiliser un tunnel `ngrok` HTTPS ou tester sur preview Vercel avec domaine custom.

---

## 2. Apple Developer Portal — Configuration

### 2.1 App ID (Identifier)

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers) → **Identifiers** → ➕ → **App IDs** → Continue → **App** → Continue.
2. **Description** : `LIBERIA Web App`
3. **Bundle ID** : `app.liberia.web` (Explicit, unique).
4. **Capabilities** : cocher ✅ **Sign In with Apple**.
5. Register.

### 2.2 Services ID (Web OAuth)

C'est l'ID utilisé pour Sign in with Apple en **web** (vs iOS natif).

1. Identifiers → ➕ → **Services IDs** → Continue.
2. **Description** : `LIBERIA Web Sign In`
3. **Identifier** : `app.liberia.web.signin` (sera notre `clientId` côté Supabase).
4. Register.
5. Ouvrir le Services ID créé → cocher ✅ **Sign In with Apple** → Configure :
   - **Primary App ID** : sélectionner `app.liberia.web` créé en 2.1.
   - **Domains and Subdomains** : `<TON_DOMAINE>` (ex: `liberia.app`).
   - **Return URLs** : `https://<TON_DOMAINE>/auth/v1/callback` (⚠️ pas `/auth/callback` qui est notre Next.js route — Apple appelle Supabase, qui appelle ensuite notre route).
   - Save.

### 2.3 Key (Sign In with Apple private key)

1. Identifiers → **Keys** → ➕.
2. **Key Name** : `LIBERIA Apple Sign In Key`.
3. ✅ **Sign In with Apple** → Configure → sélectionner Primary App ID `app.liberia.web` → Save.
4. Continue → Register.
5. **Télécharger le fichier `.p8`** — ⚠️ une seule fois, ensuite Apple le supprime de leurs serveurs.
6. Noter le **Key ID** affiché (10 caractères, ex `ABCD123456`).

---

## 3. Supabase Dashboard — Configuration

1. Supabase Dashboard → **Authentication** → **Providers** → **Apple**.
2. Activer le toggle.
3. Renseigner :
   - **Client ID** (Services ID) : `app.liberia.web.signin` (créé en 2.2).
   - **Secret Key (for OAuth)** : générer le JWT secret signé avec la clé `.p8` (cf. §3.1).
   - **Authorized Client IDs** : `app.liberia.web.signin` (même valeur).
4. Save.
5. Aller dans **Authentication** → **URL Configuration** :
   - **Site URL** : `https://<TON_DOMAINE>` (sans trailing slash).
   - **Redirect URLs** (whitelist) : ajouter
     - `https://<TON_DOMAINE>/auth/callback`
     - `https://<TON_DOMAINE>/**` (wildcard pour les `next=` params)
     - Preview Vercel si besoin : `https://<branch>.vercel.app/auth/callback`.

### 3.1 Générer le JWT secret Apple

Le "Secret Key" demandé par Supabase n'est PAS le `.p8`. C'est un **JWT signé** avec le `.p8`, expirant tous les 6 mois (max selon Apple).

Script Node.js minimal — à exécuter localement, JAMAIS committer le résultat :

```bash
npm install --no-save jsonwebtoken
```

```javascript
// gen-apple-secret.mjs
import fs from "node:fs";
import jwt from "jsonwebtoken";

const TEAM_ID = "<TON_TEAM_ID>";              // Apple Developer > Membership
const KEY_ID = "<KEY_ID_DU_.P8>";              // 10 chars, cf. §2.3
const CLIENT_ID = "app.liberia.web.signin";   // Services ID
const PRIVATE_KEY = fs.readFileSync("AuthKey_XXX.p8", "utf8");

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180, // 180 jours
    aud: "https://appleid.apple.com",
    sub: CLIENT_ID,
  },
  PRIVATE_KEY,
  {
    algorithm: "ES256",
    keyid: KEY_ID,
  }
);

console.log(token);
```

Copier le token dans Supabase → Apple Provider → **Secret Key**.

⚠️ **Renouvellement** : Apple impose un max de 6 mois. Mettre un rappel dans le calendrier équipe pour régénérer + reconfigurer Supabase tous les 5 mois.

---

## 4. Vercel — Variables d'environnement

```bash
NEXT_PUBLIC_AUTH_APPLE_ENABLED=true
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true    # (idem pour Google si activé)
NEXT_PUBLIC_APP_URL=https://liberia.app # critique pour le redirect_uri OAuth
```

Sans `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true`, le composant `<SocialLoginButtons />` n'affiche PAS le bouton Apple (vérifié dans `lib/env.ts:42-44`) — pas de bouton mort.

---

## 5. Code applicatif (état actuel — Sprint S2-BIS)

Aucune modification de code requise. Le wiring est complet :

| Fichier | Rôle |
|---|---|
| `lib/env.ts:42-44` | `isAppleAuthConfigured()` lit `NEXT_PUBLIC_AUTH_APPLE_ENABLED` |
| `components/auth/social-login.tsx:46-67` | `signInWithOAuth({ provider: "apple" })` + redirectTo `/auth/callback?next=...` |
| `app/auth/callback/route.ts` | `exchangeCodeForSession(code)` → session cookie + redirect `next` |
| `components/auth/social-login.tsx:95-101` | Render conditionnel du bouton Apple uniquement si flag activé |
| `messages/{locale}/auth.json#social.apple` | i18n × 6 locales |

Côté CSS : Apple impose ses **guidelines de bouton** (Human Interface Guidelines — Sign in with Apple). Notre bouton actuel utilise le glyphe officiel Apple (svg path inline) sur fond blanc avec bordure 1px — conforme aux specs.

---

## 6. Test de validation manuel

1. Variables Vercel poussées → redéployer preview/prod.
2. Ouvrir `https://<TON_DOMAINE>/login` sur un device avec un Apple ID configuré (Mac/iPhone/iPad).
3. Cliquer "Continuer avec Apple".
4. Pop-up Apple → confirmer avec Face ID / mot de passe.
5. **Si Apple demande "Cacher mon email"** : OK, Apple génère un email relais `xxx@privaterelay.appleid.com` qui forward sur le vrai email. Supabase capture ce relais comme email user.
6. Redirect vers `/auth/callback?code=...` → `exchangeCodeForSession` → redirect vers `/dashboard` (ou `next`).
7. Vérifier dans Supabase Dashboard → **Authentication** → **Users** : nouveau user créé avec provider `apple`.

---

## 7. Pièges connus

| Symptôme | Cause | Fix |
|---|---|---|
| "invalid_client" Apple | Services ID ≠ Supabase Client ID | Vérifier que les deux sont identiques |
| "invalid_grant" | JWT secret expiré | Régénérer (cf. §3.1) |
| Redirect ne marche pas en preview | Domaine preview pas dans Apple Return URLs | Ajouter le domaine preview ou tester en prod |
| `redirect_uri_mismatch` Supabase | Site URL Supabase ≠ NEXT_PUBLIC_APP_URL | Aligner les deux |
| Bouton invisible en prod | `NEXT_PUBLIC_AUTH_APPLE_ENABLED` pas défini | Set à `true` dans Vercel + redéployer |
| Email relayé Apple inutilisable pour Resend | Apple relay `*.privaterelay.appleid.com` accepté par Resend mais réponses bounce | Documenter dans privacy policy |

---

## 8. Checklist d'activation

- [ ] App ID créé avec capability Sign In with Apple
- [ ] Services ID créé avec domaine + return URL configurés
- [ ] Key `.p8` téléchargée et stockée hors-repo (1Password, Vault)
- [ ] JWT secret généré via `gen-apple-secret.mjs` (180 jours)
- [ ] Provider Apple activé dans Supabase + JWT collé
- [ ] Site URL + Redirect URLs whitelistés dans Supabase
- [ ] `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` poussé en Vercel
- [ ] Test manuel réussi sur device Apple
- [ ] Rappel calendrier "Renouveler JWT Apple" tous les 5 mois
