import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import {
  getStarterPlan,
  type StarterTranslator,
} from "@/lib/plan/starter-template";

import frApp from "@/messages/fr/app.json";
import enApp from "@/messages/en/app.json";
import deApp from "@/messages/de/app.json";
import itApp from "@/messages/it/app.json";
import esApp from "@/messages/es/app.json";
import ptApp from "@/messages/pt/app.json";

const SITUATIONS = ["struggling", "tight", "stable", "comfortable"] as const;
const LOCALES = [
  ["fr", frApp],
  ["en", enApp],
  ["de", deApp],
  ["it", itApp],
  ["es", esApp],
  ["pt", ptApp],
] as const;

function makeTranslator(locale: string, app: unknown): StarterTranslator {
  // Cast the whole call through `unknown` — next-intl's namespace param
  // is typed against the message shape; we pin it to the inner subtree
  // that getStarterPlan expects.
  return createTranslator({
    locale,
    messages: { app } as unknown as Record<string, unknown>,
    namespace: "app.plan.starter.content" as never,
  }) as unknown as StarterTranslator;
}

describe("getStarterPlan — starter 90-day plan content", () => {
  for (const [locale, app] of LOCALES) {
    for (const situation of SITUATIONS) {
      it(`renders ${situation} in ${locale} without missing keys`, () => {
        const t = makeTranslator(locale, app);
        const plan = getStarterPlan(situation, t);
        expect(plan.title).toBeTruthy();
        expect(plan.summary).toBeTruthy();
        // 5 common steps + 8 path steps = 13
        expect(plan.steps).toHaveLength(13);
        for (const step of plan.steps) {
          expect(step.focus).toBeTruthy();
          expect(step.title).toBeTruthy();
          expect(step.description).toBeTruthy();
          expect(step.week_number).toBeGreaterThan(0);
        }
      });
    }
  }
});
