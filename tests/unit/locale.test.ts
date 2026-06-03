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

  it("ships every requested language", () => {
    const ids = new Set(LANGUAGES.map((l) => l.id));
    [
      "fr","fr-CH","fr-FR","en","en-US","en-GB",
      "de","it","es","pt","hr","sr","bs","sq","tr","ar",
    ].forEach((id) => expect(ids.has(id as never)).toBe(true));
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
    expect(getDefaultCurrencyForCountry("HR")).toBe("EUR");
    expect(getDefaultLanguageForCountry("HR")).toBe("hr");
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
    expect(getLocaleForLanguage("hr")).toBe("hr");
    expect(getLocaleForLanguage("ar", null)).toBe("ar");
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
    ["HR", "EUR", "hr"],
    ["US", "USD", "en-US"],
    ["TR", "TRY", "tr"],
  ];
  for (const [country, currency, language] of combos) {
    it(`${country} + ${currency} + ${language}`, () => {
      expect(isCountryId(country)).toBe(true);
      expect(isCurrencyId(currency)).toBe(true);
      expect(isLanguageId(language)).toBe(true);
    });
  }
});
