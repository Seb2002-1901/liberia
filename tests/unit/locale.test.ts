import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  findCountry,
  getDefaultCurrencyForCountry,
  getDefaultLanguageForCountry,
  isCountryId,
} from "@/lib/locale/countries";
import {
  CURRENCIES,
  isCurrencyId,
} from "@/lib/locale/currencies";
import {
  LANGUAGES,
  getLocaleForLanguage,
  isLanguageId,
} from "@/lib/locale/languages";

describe("locale catalogs — V1.1 surface", () => {
  it("ships the 15 supported countries", () => {
    expect(COUNTRIES.map((c) => c.id)).toEqual([
      "CH", "FR", "BE", "DE", "IT", "GB", "US",
      "CA", "PT", "ES", "HR", "RS", "BA", "AL", "TR",
    ]);
  });

  it("ships the 6 supported currencies", () => {
    expect(CURRENCIES.map((c) => c.id).sort()).toEqual([
      "CAD", "CHF", "EUR", "GBP", "TRY", "USD",
    ]);
  });

  it("ships every fully-translated language (base + region variants)", () => {
    expect(LANGUAGES.map((l) => l.id)).toEqual([
      "fr","fr-CH","fr-FR",
      "en","en-US","en-GB",
      "de","it","es","pt",
    ]);
  });

  it("rejects languages whose catalogue isn't shipped", () => {
    for (const id of ["hr","sr","bs","sq","tr","ar"]) {
      expect(isLanguageId(id)).toBe(false);
    }
  });

  it("guards inputs at the type boundary", () => {
    expect(isCountryId("CH")).toBe(true);
    expect(isCountryId("ZZ")).toBe(false);
    expect(isCurrencyId("CHF")).toBe(true);
    expect(isCurrencyId("JPY")).toBe(false);
    expect(isLanguageId("fr-CH")).toBe(true);
    expect(isLanguageId("klingon")).toBe(false);
  });
});

describe("country → suggested defaults", () => {
  it("Swiss profile defaults to CHF + fr-CH", () => {
    expect(getDefaultCurrencyForCountry("CH")).toBe("CHF");
    expect(getDefaultLanguageForCountry("CH")).toBe("fr-CH");
  });

  it("eurozone profiles default to EUR with native language", () => {
    expect(getDefaultCurrencyForCountry("FR")).toBe("EUR");
    expect(getDefaultLanguageForCountry("FR")).toBe("fr-FR");
    expect(getDefaultCurrencyForCountry("IT")).toBe("EUR");
    expect(getDefaultLanguageForCountry("IT")).toBe("it");
    expect(getDefaultCurrencyForCountry("DE")).toBe("EUR");
    expect(getDefaultLanguageForCountry("DE")).toBe("de");
  });

  it("countries without a translated native language default to en", () => {
    // Croatian / Serbian / Bosnian / Albanian / Turkish catalogues
    // aren't shipped — the country still selects EUR/TRY for currency
    // but defaults the UI to English instead of staring at a blank
    // fallback.
    expect(getDefaultLanguageForCountry("HR")).toBe("en");
    expect(getDefaultLanguageForCountry("RS")).toBe("en");
    expect(getDefaultLanguageForCountry("BA")).toBe("en");
    expect(getDefaultLanguageForCountry("AL")).toBe("en");
    expect(getDefaultLanguageForCountry("TR")).toBe("en");
  });

  it("USD / GBP / CAD / TRY each map to the right country", () => {
    expect(getDefaultCurrencyForCountry("US")).toBe("USD");
    expect(getDefaultCurrencyForCountry("GB")).toBe("GBP");
    expect(getDefaultCurrencyForCountry("CA")).toBe("CAD");
    expect(getDefaultCurrencyForCountry("TR")).toBe("TRY");
  });

  it("falls back to CH defaults for unknown country", () => {
    expect(getDefaultCurrencyForCountry("ZZ")).toBe("CHF");
    expect(getDefaultLanguageForCountry(null)).toBe("fr-CH");
  });

  it("findCountry returns undefined for unknown id", () => {
    expect(findCountry("CH")?.label).toBe("Suisse");
    expect(findCountry("ZZ")).toBeUndefined();
  });
});

describe("getLocaleForLanguage — country-aware tag resolution", () => {
  it("returns region-qualified tags unchanged", () => {
    expect(getLocaleForLanguage("fr-CH")).toBe("fr-CH");
    expect(getLocaleForLanguage("en-GB", "US")).toBe("en-GB");
  });

  it("attaches the country region to a bare language tag", () => {
    expect(getLocaleForLanguage("fr", "CH")).toBe("fr-CH");
    expect(getLocaleForLanguage("fr", "FR")).toBe("fr-FR");
    expect(getLocaleForLanguage("de", "CH")).toBe("de-CH");
    expect(getLocaleForLanguage("it", "CH")).toBe("it-CH");
  });

  it("returns bare language when country is missing", () => {
    expect(getLocaleForLanguage("pt")).toBe("pt");
    expect(getLocaleForLanguage("de", null)).toBe("de");
  });

  it("defaults to 'fr' when language is empty", () => {
    expect(getLocaleForLanguage("")).toBe("fr");
    expect(getLocaleForLanguage(null)).toBe("fr");
  });
});

describe("required V1.1 combinations all validate", () => {
  // The form-emitted (country, currency, locale) tuples must all match
  // the catalogs so updateProfileLocale's zod schema (which derives
  // its enums from these same lists) accepts them.
  const combos: Array<[string, string, string]> = [
    ["CH", "CHF", "fr-CH"],
    ["CH", "CHF", "it"],
    ["CH", "CHF", "de"],
    ["CH", "CHF", "en"],
    ["FR", "EUR", "fr-FR"],
    ["IT", "EUR", "it"],
    ["HR", "EUR", "en"],
    ["US", "USD", "en-US"],
    ["TR", "TRY", "en"],
  ];
  for (const [country, currency, language] of combos) {
    it(`${country} + ${currency} + ${language}`, () => {
      expect(isCountryId(country)).toBe(true);
      expect(isCurrencyId(currency)).toBe(true);
      expect(isLanguageId(language)).toBe(true);
    });
  }
});
