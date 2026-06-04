/**
 * Language catalog (V1). The `id` is the value persisted on
 * `profiles.locale` (a BCP-47 tag, optionally region-qualified). For
 * `Intl.NumberFormat` / `Intl.DateTimeFormat` we either use the id
 * directly when it already carries a region, or pair it with the
 * user's country via `getLocaleForLanguage` so a Swiss French user
 * gets `'1'234 CHF'` formatting and a French French user gets
 * `'1 234 €'`.
 *
 * Only languages with a complete `messages/<base>/*.json` catalogue
 * appear here — exposing a language in the selector without shipping
 * its translations leaves users staring at fallback English with no
 * indication anything is wrong. Region variants of fr/en stay because
 * they resolve to the same base catalogue but drive locale-aware
 * number / date formatting via `getLocaleForLanguage`.
 */
export type LanguageId =
  | "fr"
  | "fr-CH"
  | "fr-FR"
  | "en"
  | "en-US"
  | "en-GB"
  | "de"
  | "it"
  | "es"
  | "pt";

export type Language = {
  id: LanguageId;
  label: string;
};

export const LANGUAGES: readonly Language[] = [
  { id: "fr", label: "Français" },
  { id: "fr-CH", label: "Français (Suisse)" },
  { id: "fr-FR", label: "Français (France)" },
  { id: "en", label: "English" },
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "es", label: "Español" },
  { id: "pt", label: "Português" },
] as const;

export function isLanguageId(value: unknown): value is LanguageId {
  return LANGUAGES.some((l) => l.id === value);
}

/**
 * English name for each supported language tag — used to inject a
 * "Respond exclusively in {name}" line into the Coach IA system
 * prompt. We keep this in English because Claude reliably honours
 * English instructions across locales, regardless of which language
 * the rest of the prompt is in.
 */
const ENGLISH_NAMES: Record<LanguageId, string> = {
  fr: "French",
  "fr-CH": "Swiss French",
  "fr-FR": "French (France)",
  en: "English",
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  de: "German",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
};

export function getLanguageEnglishName(
  language: string | null | undefined,
): string {
  if (language && isLanguageId(language)) return ENGLISH_NAMES[language];
  return ENGLISH_NAMES.en;
}

/**
 * Resolve a BCP-47 tag suitable for `Intl.NumberFormat` /
 * `Intl.DateTimeFormat`. If the language already carries a region
 * (e.g. `'fr-CH'`, `'en-GB'`) it is returned as-is. Otherwise, when
 * a country is known and yields a valid Intl region tag, we attach
 * it so generic language picks still feel native (`'fr'` + country
 * `'CH'` → `'fr-CH'`).
 *
 * Defensive: invalid combos fall back to the bare language. The
 * built-in `Intl` constructors are happy with bare tags.
 */
export function getLocaleForLanguage(
  language: string | null | undefined,
  country?: string | null,
): string {
  const lang = language?.trim() || "fr";
  if (lang.includes("-")) return lang;
  const c = country?.trim();
  if (!c) return lang;
  return `${lang}-${c}`;
}
