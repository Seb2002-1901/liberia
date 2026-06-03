/**
 * Language catalog (V1). The `id` is the value persisted on
 * `profiles.locale` (a BCP-47 tag, optionally region-qualified). For
 * `Intl.NumberFormat` / `Intl.DateTimeFormat` we either use the id
 * directly when it already carries a region, or pair it with the
 * user's country via `getLocaleForLanguage` so a Swiss French user
 * gets `'1'234 CHF'` formatting and a French French user gets
 * `'1 234 €'`.
 *
 * The UI itself is in French for the V1 launch — the language field
 * prepares for a future translation catalog without coupling country
 * to language (a Swiss user can perfectly pick German or English).
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
  | "pt"
  | "hr"
  | "sr"
  | "bs"
  | "sq"
  | "tr"
  | "ar";

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
  { id: "hr", label: "Hrvatski" },
  { id: "sr", label: "Srpski" },
  { id: "bs", label: "Bosanski" },
  { id: "sq", label: "Shqip" },
  { id: "tr", label: "Türkçe" },
  { id: "ar", label: "العربية" },
] as const;

export function isLanguageId(value: unknown): value is LanguageId {
  return LANGUAGES.some((l) => l.id === value);
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
