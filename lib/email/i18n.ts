import { createTranslator } from "next-intl";
import {
  type AppLocale,
  loadLocaleFor,
  resolveAppLocale,
} from "@/i18n/config";
import type { LayoutLocaleStrings } from "@/lib/email/layout";

/**
 * Builds a translator scoped to `email.*` for use inside email
 * templates (cron, webhook handlers — any non-request context where
 * `useTranslations` / `getTranslations` aren't available).
 *
 * The translator is async because we lazy-import the locale-specific
 * JSON. Resolution mirrors the runtime:
 *   - `profile.locale` → base AppLocale (e.g. `fr-CH` → `fr`)
 *   - locales without a full catalogue fall back to English
 *
 * Returns both the translator and the resolved locale so callers can
 * pass it to `Intl.DateTimeFormat` / `Intl.NumberFormat` for
 * consistent number / date formatting.
 */
export async function createEmailTranslator(
  rawLocale: string | null | undefined,
): Promise<{
  t: ReturnType<typeof createTranslator>;
  locale: AppLocale;
  intlLocale: string;
}> {
  const requested = resolveAppLocale(rawLocale);
  const loaded = loadLocaleFor(requested);
  const messages = (
    (await import(`@/messages/${loaded}/email.json`)) as {
      default: Record<string, unknown>;
    }
  ).default;
  const t = createTranslator({
    locale: requested,
    messages: { email: messages },
    namespace: "email",
  });
  // For number / date formatting we want the user's original tag (which
  // may include a region — e.g. fr-CH) so the email shows the right
  // separators and date order.
  const intlLocale = rawLocale && rawLocale.length >= 2 ? rawLocale : requested;
  return { t, locale: requested, intlLocale };
}

/**
 * Returns the locale strings required by `renderLayout`. The
 * `settingsUrl` is interpolated into the default footer disclaimer so
 * the link is clickable without HTML escaping the markup we want to
 * keep (the surrounding template still escapes user-supplied values).
 */
export function getLayoutLocaleStrings(
  t: ReturnType<typeof createTranslator>,
  locale: AppLocale,
  settingsUrl: string,
): LayoutLocaleStrings {
  return {
    htmlLang: locale,
    appDisclaimer: t("common.appDisclaimer"),
    defaultFooterDisclaimer: t("common.defaultFooterDisclaimer", { settingsUrl }),
    unsubscribeNonEssential: t("common.unsubscribeNonEssential"),
  };
}
