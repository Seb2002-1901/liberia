import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";

// Every string leaf in every locale must compile through next-intl's ICU
// parser. Any code other than MISSING_MESSAGE (sub-object navigation,
// expected when probing) and FORMATTING_ERROR for a missing rich-text
// tag callback (expected for `<strong>` / `<a>` keys called via
// `t.rich()` in real code) is a real catalogue bug — it would crash
// every page that loads that namespace.
//
// Historical trigger: `email.common.defaultFooterDisclaimer` embedded
// `<a href="{settingsUrl}" style="…">` inside an ICU message, which
// next-intl rejected with INVALID_MESSAGE every time an email was
// rendered.

const LOCALES = ["fr", "en", "de", "it", "es", "pt"];
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

const PARAMS: Record<string, string | number> = {
  firstName: "X",
  count: 2,
  days: 3,
  pct: 12,
  gap: "X",
  target: "X",
  cashflow: "X",
  months: 2.5,
  monthlyExpenses: "X",
  monthlyTarget: "X",
  cut: "X",
  rate: "X",
  estimate: "X",
  projection: "X",
  targetCut: "X",
  date: "X",
  delta: "X",
  goal: "X",
  remaining: "X",
  amount: "X",
  score: 70,
  tone: "X",
  doneNoun: "X",
  remainingNoun: "X",
  done: 2,
  total: 5,
  model: "X",
  week: 4,
  n: 4,
  year: 2025,
  limit: 5,
  monthly: "X",
  savings: "X",
  ack: "X",
  tail: "X",
  fundNote: "X",
  title: "X",
  settingsUrl: "/settings",
  label: "X",
  text: "X",
  current: 2,
  name: "X",
};

function loadAll(locale: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ns of NAMESPACES) {
    out[ns] = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "messages", locale, `${ns}.json`),
        "utf8",
      ),
    );
  }
  return out;
}

type Issue = { key: string; code: string; msg: string };

function probe(
  locale: string,
): { invalid: Issue[]; otherFormatting: Issue[] } {
  const messages = loadAll(locale);
  const t = createTranslator({ locale, messages });

  const invalid: Issue[] = [];
  const otherFormatting: Issue[] = [];

  // next-intl logs internal warnings via console.error. Track them so
  // structural bugs (INVALID_MESSAGE) surface as test failures.
  let current: { key: string; value: string } | null = null;
  const origErr = console.error;
  console.error = (...args: unknown[]) => {
    for (const a of args) {
      if (a && typeof a === "object" && "code" in a) {
        const code = (a as { code: string }).code;
        const msg =
          ((a as { originalMessage?: string }).originalMessage ??
            (a as { message?: string }).message ??
            "").slice(0, 200);
        if (code === "MISSING_MESSAGE") continue;
        if (code === "INVALID_MESSAGE") {
          invalid.push({ key: current?.key ?? "?", code, msg });
        } else if (code === "FORMATTING_ERROR") {
          // Missing-context-variable errors come from rich-text tags
          // (`<strong>`, `<a>`, `<code>`) that real callers supply via
          // `t.rich({ strong: chunks => … })`. They aren't catalogue
          // bugs — only flag genuinely broken templates.
          if (/string context variable/.test(msg)) continue;
          otherFormatting.push({ key: current?.key ?? "?", code, msg });
        }
      }
    }
  };

  function walk(obj: unknown, segs: string[]): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === "string") {
      current = { key: segs.join("."), value: obj };
      try {
        // Cast — next-intl's t() is typed against the message tree;
        // we're probing dynamically so we bypass the strict path check.
        (t as unknown as (k: string, v: typeof PARAMS) => string)(
          segs.join("."),
          PARAMS,
        );
      } catch {
        // The async error path is already captured via console.error.
      }
      current = null;
      return;
    }
    if (typeof obj !== "object" || Array.isArray(obj)) return;
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      walk((obj as Record<string, unknown>)[k], [...segs, k]);
    }
  }

  for (const ns of NAMESPACES) {
    walk(messages[ns], [ns]);
  }

  console.error = origErr;
  return { invalid, otherFormatting };
}

describe("message catalogues — ICU template safety", () => {
  for (const locale of LOCALES) {
    it(`${locale}: no INVALID_MESSAGE`, () => {
      const { invalid } = probe(locale);
      expect(
        invalid,
        `INVALID_MESSAGE keys: ${invalid
          .map((i) => i.key)
          .join(", ")}`,
      ).toEqual([]);
    });

    it(`${locale}: no unexpected FORMATTING_ERROR`, () => {
      const { otherFormatting } = probe(locale);
      expect(
        otherFormatting,
        `Unexpected formatting errors: ${otherFormatting
          .map((i) => `${i.key} (${i.msg})`)
          .join("; ")}`,
      ).toEqual([]);
    });
  }
});
