import { describe, it, expect, vi } from "vitest";
import { localizeAuthError } from "@/lib/auth/error-messages";

/**
 * Sprint S2-BIS — mapping Supabase Auth → clés i18n.
 *
 * On valide chaque pattern observé en prod : un message brut anglais
 * de Supabase doit être traduit en clé `auth.errors.*` stable, jamais
 * fuiter le message brut au user (UX premium localisée).
 */

function makeTranslator() {
  return vi.fn((key: string) => `T(${key})`) as unknown as Parameters<
    typeof localizeAuthError
  >[1];
}

describe("localizeAuthError", () => {
  it.each([
    ["Invalid login credentials", "auth.errors.invalidCredentials"],
    ["Email not confirmed", "auth.errors.emailNotConfirmed"],
    ["User already registered", "auth.errors.userAlreadyExists"],
    ["Email rate limit exceeded", "auth.errors.rateLimitExceeded"],
    ["Too many requests", "auth.errors.rateLimitExceeded"],
    ["Password should be at least 8 characters", "auth.errors.passwordTooShort"],
    ["Password is too weak", "auth.errors.passwordTooWeak"],
    ["Signups not allowed for this instance", "auth.errors.signupsDisabled"],
    ["Captcha verification failed", "auth.errors.captchaFailed"],
    ["Token has expired or is invalid", "auth.errors.tokenExpired"],
    ["JWT expired", "auth.errors.tokenExpired"],
    ["Unauthorized", "auth.errors.unauthorized"],
    ["Network error", "auth.errors.networkError"],
    ["Fetch failed", "auth.errors.networkError"],
  ])('"%s" → %s', (raw, expectedKey) => {
    const t = makeTranslator();
    expect(localizeAuthError(raw, t)).toBe(`T(${expectedKey})`);
    expect(t).toHaveBeenCalledWith(expectedKey);
  });

  it("falls back to generic on unknown message", () => {
    const t = makeTranslator();
    expect(localizeAuthError("Some Supabase internal thing", t)).toBe(
      "T(auth.errors.generic)",
    );
  });

  it("falls back to generic on null/undefined/empty", () => {
    const t = makeTranslator();
    expect(localizeAuthError(null, t)).toBe("T(auth.errors.generic)");
    expect(localizeAuthError(undefined, t)).toBe("T(auth.errors.generic)");
    expect(localizeAuthError("", t)).toBe("T(auth.errors.generic)");
  });
});
