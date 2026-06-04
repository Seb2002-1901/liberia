/**
 * App-wide locale catalogue for next-intl.
 *
 * - `locales` lists every BCP-47 base tag the app can present an
 *   interface in. Mirrors `lib/locale/languages.ts` minus the region-
 *   qualified variants (region affects formatting, not translations).
 *   Every locale listed here MUST ship a complete catalogue under
 *   `messages/<locale>/*.json` — the parity test in
 *   `tests/unit/messages-coverage.test.ts` fails otherwise.
 * - `defaultLocale` is the ultimate fallback when no preference can
 *   be derived (anonymous request without cookie or Accept-Language).
 * - `FULLY_TRANSLATED` historically distinguished production-ready
 *   locales from placeholders. We now require every locale in
 *   `locales` to be production-ready, so the set is identical — kept
 *   as a named export for back-compat with `loadLocaleFor` callers.
 */
export const locales = [
  "fr",
  "en",
  "de",
  "it",
  "es",
  "pt",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const FULLY_TRANSLATED: ReadonlySet<AppLocale> = new Set<AppLocale>(
  locales,
);

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
 * Every supported locale now ships a complete catalogue, so this is a
 * no-op — kept as a stable entry point in case we ever reintroduce
 * partial-translation locales.
 */
export function loadLocaleFor(requested: AppLocale): AppLocale {
  return FULLY_TRANSLATED.has(requested) ? requested : "en";
}
