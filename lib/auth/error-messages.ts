/**
 * Mapping des codes erreur Supabase Auth vers nos clés i18n.
 *
 * Supabase Auth renvoie des messages en anglais hardcodés au niveau
 * de l'API (ex: "Invalid login credentials", "Email rate limit
 * exceeded"). Pour un produit premium localisé, on ne peut pas
 * afficher ces strings telles quelles au user EN/FR/DE/etc.
 *
 * Cette fonction normalise le message brut en une clé i18n stable
 * que `useTranslations("auth.errors")` peut résoudre. Si aucun mapping
 * connu, fallback générique.
 */

import { useTranslations } from "next-intl";

type T = ReturnType<typeof useTranslations>;

/**
 * Patterns Supabase Auth observés en production. La normalisation
 * lowercase + match exact ou contains. L'ordre compte (premier match
 * gagne).
 */
const PATTERNS: ReadonlyArray<{ test: RegExp; key: string }> = [
  { test: /invalid login credentials/i, key: "invalidCredentials" },
  { test: /email not confirmed/i, key: "emailNotConfirmed" },
  { test: /user already registered/i, key: "userAlreadyExists" },
  { test: /email rate limit/i, key: "rateLimitExceeded" },
  { test: /too many requests/i, key: "rateLimitExceeded" },
  { test: /password.*at least.*6/i, key: "passwordTooShort" },
  { test: /password.*at least.*8/i, key: "passwordTooShort" },
  { test: /password is too weak/i, key: "passwordTooWeak" },
  { test: /signups not allowed/i, key: "signupsDisabled" },
  { test: /captcha/i, key: "captchaFailed" },
  { test: /token.*(expired|invalid)/i, key: "tokenExpired" },
  { test: /jwt expired/i, key: "tokenExpired" },
  { test: /unauthorized/i, key: "unauthorized" },
  { test: /network/i, key: "networkError" },
  { test: /fetch failed/i, key: "networkError" },
];

export function localizeAuthError(
  rawMessage: string | undefined | null,
  t: T,
): string {
  if (!rawMessage) return t("auth.errors.generic");
  for (const p of PATTERNS) {
    if (p.test.test(rawMessage)) {
      return t(`auth.errors.${p.key}`);
    }
  }
  return t("auth.errors.generic");
}
