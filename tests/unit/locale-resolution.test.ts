import { describe, expect, it } from "vitest";
import {
  isAppLocale,
  loadLocaleFor,
  resolveAppLocale,
  defaultLocale,
  locales,
  FULLY_TRANSLATED,
} from "@/i18n/config";
import { LANGUAGES } from "@/lib/locale/languages";

// Invariant: the NEXT_LOCALE cookie must always hold a base AppLocale.
// Anything else (region variant like "fr-CH", legacy ids like "hr",
// random junk) MUST normalise to a member of `locales` so next-intl
// can load the catalogue without throwing.
//
// Every dropdown entry in the profile form must map cleanly:
//   "fr"     → "fr"
//   "fr-CH"  → "fr"
//   "fr-FR"  → "fr"
//   "en"     → "en"
//   "en-US"  → "en"
//   "en-GB"  → "en"
//   "de" / "it" / "es" / "pt" → identity

describe("locale resolution — cookie/DB → next-intl base", () => {
  it("every supported AppLocale stays itself when resolved", () => {
    for (const loc of locales) {
      expect(resolveAppLocale(loc)).toBe(loc);
    }
  });

  it("every selector entry resolves to a supported base", () => {
    for (const lang of LANGUAGES) {
      const base = resolveAppLocale(lang.id);
      expect(
        (locales as readonly string[]).includes(base),
        `${lang.id} resolved to ${base} which isn't a supported app locale.`,
      ).toBe(true);
      expect(
        FULLY_TRANSLATED.has(base),
        `${lang.id} resolved to ${base} which isn't fully translated.`,
      ).toBe(true);
    }
  });

  it("strips region qualifiers", () => {
    expect(resolveAppLocale("fr-CH")).toBe("fr");
    expect(resolveAppLocale("fr-FR")).toBe("fr");
    expect(resolveAppLocale("en-US")).toBe("en");
    expect(resolveAppLocale("en-GB")).toBe("en");
    expect(resolveAppLocale("de-AT")).toBe("de");
    expect(resolveAppLocale("pt-BR")).toBe("pt");
  });

  it("normalises case", () => {
    expect(resolveAppLocale("FR")).toBe("fr");
    expect(resolveAppLocale("EN-US")).toBe("en");
    expect(resolveAppLocale("DE-ch")).toBe("de");
  });

  it("falls back to defaultLocale for unsupported / junk inputs", () => {
    expect(resolveAppLocale(null)).toBe(defaultLocale);
    expect(resolveAppLocale("")).toBe(defaultLocale);
    expect(resolveAppLocale("hr")).toBe(defaultLocale);
    expect(resolveAppLocale("ar")).toBe(defaultLocale);
    expect(resolveAppLocale("klingon")).toBe(defaultLocale);
  });

  it("isAppLocale only accepts shipped bases", () => {
    for (const loc of locales) expect(isAppLocale(loc)).toBe(true);
    for (const stale of ["hr", "sr", "bs", "sq", "tr", "ar", "fr-CH", "en-US"]) {
      expect(isAppLocale(stale)).toBe(false);
    }
  });

  it("loadLocaleFor is identity for fully-translated locales", () => {
    for (const loc of locales) {
      expect(loadLocaleFor(loc)).toBe(loc);
    }
  });
});
