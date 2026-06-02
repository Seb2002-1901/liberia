/**
 * Pays / devise / langue supportés au lancement. Chaque entrée est
 * une combinaison cohérente — pas de produit cartésien (un Suisse ne
 * peut pas piquer locale='en-US' avec country='CH' depuis le formulaire,
 * ça resterait techniquement valide en DB mais c'est volontairement
 * absent du choix UI pour rester premium et focus marché.).
 * Les valeurs miroitent les CHECK constraints DB.
 */
export type RegionId =
  | "CH"
  | "FR"
  | "BE"
  | "DE"
  | "IT"
  | "GB"
  | "US";

export type Region = {
  id: RegionId;
  country: RegionId;
  countryLabel: string;
  currency: "CHF" | "EUR" | "USD" | "GBP";
  locale: "fr-CH" | "fr-FR" | "en-US" | "en-GB" | "de-DE" | "it-IT";
  languageLabel: string;
};

export const REGIONS: readonly Region[] = [
  {
    id: "CH",
    country: "CH",
    countryLabel: "Suisse",
    currency: "CHF",
    locale: "fr-CH",
    languageLabel: "Français (Suisse)",
  },
  {
    id: "FR",
    country: "FR",
    countryLabel: "France",
    currency: "EUR",
    locale: "fr-FR",
    languageLabel: "Français",
  },
  {
    id: "BE",
    country: "BE",
    countryLabel: "Belgique",
    currency: "EUR",
    locale: "fr-FR",
    languageLabel: "Français",
  },
  {
    id: "DE",
    country: "DE",
    countryLabel: "Allemagne",
    currency: "EUR",
    locale: "de-DE",
    languageLabel: "Deutsch",
  },
  {
    id: "IT",
    country: "IT",
    countryLabel: "Italie",
    currency: "EUR",
    locale: "it-IT",
    languageLabel: "Italiano",
  },
  {
    id: "GB",
    country: "GB",
    countryLabel: "Royaume-Uni",
    currency: "GBP",
    locale: "en-GB",
    languageLabel: "English",
  },
  {
    id: "US",
    country: "US",
    countryLabel: "États-Unis",
    currency: "USD",
    locale: "en-US",
    languageLabel: "English",
  },
] as const;

export function findRegion(
  country: string | null | undefined,
): Region | undefined {
  return REGIONS.find((r) => r.country === country);
}
