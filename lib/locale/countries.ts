import type { CurrencyId } from "@/lib/locale/currencies";
import type { LanguageId } from "@/lib/locale/languages";

/**
 * Country catalog (V1). The country is independent of the currency
 * and the language on the profile — a user in Switzerland may pay
 * in CHF and use the app in Italian or English. Country drives only
 * the *suggestions* the form pre-fills when the user picks it for
 * the first time (or changes it). The user can then override either
 * field without restriction.
 */
export type CountryId =
  | "CH"
  | "FR"
  | "BE"
  | "DE"
  | "IT"
  | "GB"
  | "US"
  | "CA"
  | "PT"
  | "ES"
  | "HR"
  | "RS"
  | "BA"
  | "AL"
  | "TR";

export type Country = {
  id: CountryId;
  label: string;
  defaultCurrency: CurrencyId;
  defaultLanguage: LanguageId;
};

export const COUNTRIES: readonly Country[] = [
  { id: "CH", label: "Suisse",                  defaultCurrency: "CHF", defaultLanguage: "fr-CH" },
  { id: "FR", label: "France",                  defaultCurrency: "EUR", defaultLanguage: "fr-FR" },
  { id: "BE", label: "Belgique",                defaultCurrency: "EUR", defaultLanguage: "fr"    },
  { id: "DE", label: "Allemagne",               defaultCurrency: "EUR", defaultLanguage: "de"    },
  { id: "IT", label: "Italie",                  defaultCurrency: "EUR", defaultLanguage: "it"    },
  { id: "GB", label: "Royaume-Uni",             defaultCurrency: "GBP", defaultLanguage: "en-GB" },
  { id: "US", label: "États-Unis",              defaultCurrency: "USD", defaultLanguage: "en-US" },
  { id: "CA", label: "Canada",                  defaultCurrency: "CAD", defaultLanguage: "en"    },
  { id: "PT", label: "Portugal",                defaultCurrency: "EUR", defaultLanguage: "pt"    },
  { id: "ES", label: "Espagne",                 defaultCurrency: "EUR", defaultLanguage: "es"    },
  { id: "HR", label: "Croatie",                 defaultCurrency: "EUR", defaultLanguage: "hr"    },
  { id: "RS", label: "Serbie",                  defaultCurrency: "EUR", defaultLanguage: "sr"    },
  { id: "BA", label: "Bosnie-Herzégovine",      defaultCurrency: "EUR", defaultLanguage: "bs"    },
  { id: "AL", label: "Albanie",                 defaultCurrency: "EUR", defaultLanguage: "sq"    },
  { id: "TR", label: "Turquie",                 defaultCurrency: "TRY", defaultLanguage: "tr"    },
] as const;

export function isCountryId(value: unknown): value is CountryId {
  return COUNTRIES.some((c) => c.id === value);
}

export function findCountry(id: string | null | undefined): Country | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

export function getDefaultCurrencyForCountry(
  country: string | null | undefined,
): CurrencyId {
  return findCountry(country)?.defaultCurrency ?? "CHF";
}

export function getDefaultLanguageForCountry(
  country: string | null | undefined,
): LanguageId {
  return findCountry(country)?.defaultLanguage ?? "fr-CH";
}
