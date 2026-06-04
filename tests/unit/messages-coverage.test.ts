import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LANGUAGES } from "@/lib/locale/languages";
import { locales as APP_LOCALES, FULLY_TRANSLATED } from "@/i18n/config";

// Coverage guarantee: every language exposed by the profile selector
// must back its UI with a fully-shipped catalogue. A locale advertised
// as "Hrvatski" in the dropdown that falls back to English the moment
// the user clicks Save is a worse UX than not offering it at all —
// so we block any partial catalogue at CI.
//
// Rule: ≥ 95 % structural parity vs the fr reference, computed over
// every leaf in every namespace.

const REFERENCE = "fr";
const NAMESPACES = [
  "common",
  "marketing",
  "auth",
  "onboarding",
  "dashboard",
  "app",
  "errors",
  "email",
];
const COVERAGE_THRESHOLD = 0.95;

function collectLeaves(obj: unknown, segs: string[], out: Set<string>): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    out.add(segs.join("\x00"));
    return;
  }
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    collectLeaves(
      (obj as Record<string, unknown>)[k],
      [...segs, k],
      out,
    );
  }
}

function loadLeaves(locale: string): Set<string> {
  const leaves = new Set<string>();
  for (const ns of NAMESPACES) {
    const p = path.join(process.cwd(), "messages", locale, `${ns}.json`);
    if (!fs.existsSync(p)) continue;
    collectLeaves(JSON.parse(fs.readFileSync(p, "utf8")), [ns], leaves);
  }
  return leaves;
}

describe("language selector — catalogue completeness gate", () => {
  const refLeaves = loadLeaves(REFERENCE);

  it("reference locale has a non-trivial catalogue", () => {
    expect(refLeaves.size).toBeGreaterThan(100);
  });

  // Base languages (no region) that back the dropdown entries.
  const baseLocales = Array.from(
    new Set(LANGUAGES.map((l) => l.id.split("-")[0])),
  ).sort();

  for (const base of baseLocales) {
    it(`${base}: catalogue covers ≥ ${(COVERAGE_THRESHOLD * 100).toFixed(0)}% of the fr reference`, () => {
      const locLeaves = loadLeaves(base);
      const covered = [...refLeaves].filter((l) => locLeaves.has(l)).length;
      const coverage = covered / refLeaves.size;
      expect(
        coverage,
        `${base} catalogue covers only ${(coverage * 100).toFixed(1)}% of ${REFERENCE} ` +
          `(${covered}/${refLeaves.size}). Either ship the missing keys or remove ${base} ` +
          `from lib/locale/languages.ts and i18n/config.ts.`,
      ).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
    });
  }

  it("every selector language has its base in i18n locales", () => {
    for (const lang of LANGUAGES) {
      const base = lang.id.split("-")[0];
      expect(
        (APP_LOCALES as readonly string[]).includes(base),
        `Language "${lang.id}" advertised in the selector but base "${base}" is missing from i18n/config.ts locales.`,
      ).toBe(true);
    }
  });

  it("every selector language is marked FULLY_TRANSLATED", () => {
    for (const lang of LANGUAGES) {
      const base = lang.id.split("-")[0];
      expect(
        (FULLY_TRANSLATED as ReadonlySet<string>).has(base),
        `Language "${lang.id}" advertised in the selector but "${base}" not in FULLY_TRANSLATED — users would see English fallback.`,
      ).toBe(true);
    }
  });

  it("no app locale is exposed without a selector entry", () => {
    const selectorBases = new Set(LANGUAGES.map((l) => l.id.split("-")[0]));
    for (const loc of APP_LOCALES) {
      expect(
        selectorBases.has(loc),
        `Locale "${loc}" present in i18n/config.ts but no selector entry in lib/locale/languages.ts — users can never pick it.`,
      ).toBe(true);
    }
  });
});
