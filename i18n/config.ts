/**
 * App-wide locale catalogue for next-intl.
 *
 * - `locales` lists every BCP-47 base tag the app can present an
 *   interface in. Mirrors `lib/locale/languages.ts` minus the region-
 *   qualified variants (region affects formatting, not translations).
 * - `defaultLocale` is the ultimate fallback when no preference can
 *   be derived (anonymous request without cookie or Accept-Language).
 * - `FULLY_TRANSLATED` lists the locales whose message catalogue is
 *   considered production-ready. Locales outside this set silently
 *   fall back to English: the profile selector keeps them visible so
 *   a user can pin their language for later, but the UI renders in EN
 *   until human translations land.
 */
export const locales = [
  "fr",
  "en",
  "de",
  "it",
  "es",
  "pt",
  "hr",
  "sr",
  "bs",
  "sq",
  "tr",
  "ar",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const FULLY_TRANSLATED: ReadonlySet<AppLocale> = new Set<AppLocale>([
  "fr",
  "en",
  "de",
  "it",
  "es",
  "pt",
]);

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Map a `profile.locale` (which can be region-qualified — `fr-CH`,
 * `en-US`) down to a base app locale (`fr`, `en`). Falls back to
 * English when the input doesn't match any supported language. Used
 * by the i18n request config and the middleware cookie setter.
 */
export function resolveAppLocale(input: string | null | undefined): AppLocale {
  if (!input) return defaultLocale;
  const lower = input.toLowerCase();
  const base = lower.split("-")[0];
  if (isAppLocale(base)) return base;
  return defaultLocale;
}

/**
 * For locales without a production catalogue yet, fall back to EN
 * messages so the UI is never blank. Returns the locale to actually
 * load JSON for.
 */
export function loadLocaleFor(requested: AppLocale): AppLocale {
  return FULLY_TRANSLATED.has(requested) ? requested : "en";
}
