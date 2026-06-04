import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// next-intl explicitly rejects any object key containing "." at message
// initialisation (INVALID_KEY) because it reserves "." for nested path
// resolution. A single offending key blows up every page that loads the
// owning namespace, with the error surfacing as the root error boundary.
// Block the regression at the source: scan every locale's JSON for
// dotted property names.
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

function collectDottedKeys(obj: unknown, prefix: string[], out: string[]): void {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key.includes(".")) out.push([...prefix, key].join(" > "));
    collectDottedKeys((obj as Record<string, unknown>)[key], [...prefix, key], out);
  }
}

describe("message catalogues — no dotted JSON keys", () => {
  for (const locale of LOCALES) {
    for (const ns of NAMESPACES) {
      it(`${locale}/${ns}.json`, () => {
        const file = path.join(
          process.cwd(),
          "messages",
          locale,
          `${ns}.json`,
        );
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        const dotted: string[] = [];
        collectDottedKeys(data, [], dotted);
        expect(
          dotted,
          `Found dotted keys (next-intl INVALID_KEY): ${dotted.join(", ")}`,
        ).toEqual([]);
      });
    }
  }
});
