import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  type AppLocale,
  defaultLocale,
  isAppLocale,
  loadLocaleFor,
  resolveAppLocale,
} from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

/**
 * next-intl entry point for Server Components.
 *
 * Resolution order (first hit wins):
 *   1. The `NEXT_LOCALE` cookie — set by middleware once we know the
 *      user's profile.locale, or by the locale form on /profile.
 *   2. The browser's `Accept-Language` header — best guess for the
 *      anonymous marketing visitor.
 *   3. `defaultLocale` ("en").
 *
 * The returned `locale` is what `useLocale()` / `useFormatter()` see.
 * Messages are loaded from `messages/<locale>/*.json`. Locales that
 * are not yet fully translated load the EN catalogue so the UI never
 * shows raw keys.
 */
export default getRequestConfig(async () => {
  const requested = await detectLocale();
  const messageLocale = loadLocaleFor(requested);
  const messages = await loadMessages(messageLocale);

  return {
    locale: requested,
    messages,
  };
});

async function detectLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  if (cookieValue && isAppLocale(cookieValue)) return cookieValue;

  const headerStore = await headers();
  const accept = headerStore.get("accept-language");
  if (accept) {
    // Accept-Language: "fr-CH,fr;q=0.9,en;q=0.8" — try each tag in
    // order, take the first that resolves to a supported base locale.
    for (const part of accept.split(",")) {
      const tag = part.split(";")[0]?.trim();
      if (!tag) continue;
      const resolved = resolveAppLocale(tag);
      if (resolved !== defaultLocale || tag.toLowerCase().startsWith("en")) {
        return resolved;
      }
    }
  }

  return defaultLocale;
}

async function loadMessages(
  locale: AppLocale,
): Promise<Record<string, unknown>> {
  // Each namespace is shipped as its own JSON so a future translator
  // workflow can update one surface (auth, dashboard, …) without
  // touching the others. We load all of them and merge under the
  // namespace key so `useTranslations("dashboard")` resolves cleanly.
  const namespaces = [
    "common",
    "marketing",
    "auth",
    "onboarding",
    "dashboard",
    "app",
    "errors",
    "email",
  ] as const;
  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      try {
        const mod = (await import(`../messages/${locale}/${ns}.json`)) as {
          default: Record<string, unknown>;
        };
        return [ns, mod.default] as const;
      } catch {
        // Missing namespace file → empty; next-intl will fall back to
        // the message key. Avoids a hard crash if a translator hasn't
        // pushed a given JSON yet.
        return [ns, {}] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
