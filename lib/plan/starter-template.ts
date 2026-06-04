/**
 * Starter 90-day plan — deterministic, curated by `situation` tier.
 *
 * Surfaced on /plan when the user has no AI-generated plan yet (because
 * ANTHROPIC_API_KEY isn't configured, or they haven't generated one).
 * Gives the sensation that LIBERIA is already accompanying them, without
 * requiring an LLM call.
 *
 * Text content lives in `messages/{locale}/app.json` under
 * `app.plan.starter.content.*`. The structure here only carries the
 * stable IDs, week numbers and categories — the caller passes a scoped
 * translator so the output renders in the user's locale.
 */

export type StarterStep = {
  week_number: number;
  focus: string;
  title: string;
  description: string;
  category: "review" | "habit" | "save" | "debt_payoff" | "income_boost";
};

export type StarterPlan = {
  title: string;
  summary: string;
  steps: StarterStep[];
};

export type StarterTranslator = ((
  key: string,
  values?: Record<string, string | number>,
) => string) & {
  raw: (key: string) => unknown;
};

type Situation = "struggling" | "tight" | "stable" | "comfortable";

type StepDef = {
  id: string;
  week_number: number;
  category: StarterStep["category"];
};

const COMMON_DEFS: StepDef[] = [
  { id: "common.w1.s1", week_number: 1, category: "review" },
  { id: "common.w1.s2", week_number: 1, category: "review" },
  { id: "common.w2.s1", week_number: 2, category: "habit" },
  { id: "common.w3.s1", week_number: 3, category: "save" },
  { id: "common.w4.s1", week_number: 4, category: "save" },
];

const STRUGGLING_DEFS: StepDef[] = [
  { id: "struggling.w5.s1", week_number: 5, category: "debt_payoff" },
  { id: "struggling.w6.s1", week_number: 6, category: "review" },
  { id: "struggling.w7.s1", week_number: 7, category: "habit" },
  { id: "struggling.w8.s1", week_number: 8, category: "review" },
  { id: "struggling.w9.s1", week_number: 9, category: "income_boost" },
  { id: "struggling.w10.s1", week_number: 10, category: "income_boost" },
  { id: "struggling.w11.s1", week_number: 11, category: "save" },
  { id: "struggling.w12.s1", week_number: 12, category: "review" },
];

const TIGHT_DEFS: StepDef[] = [
  { id: "tight.w5.s1", week_number: 5, category: "review" },
  { id: "tight.w6.s1", week_number: 6, category: "habit" },
  { id: "tight.w7.s1", week_number: 7, category: "save" },
  { id: "tight.w8.s1", week_number: 8, category: "save" },
  { id: "tight.w9.s1", week_number: 9, category: "debt_payoff" },
  { id: "tight.w10.s1", week_number: 10, category: "debt_payoff" },
  { id: "tight.w11.s1", week_number: 11, category: "habit" },
  { id: "tight.w12.s1", week_number: 12, category: "review" },
];

const STABLE_DEFS: StepDef[] = [
  { id: "stable.w5.s1", week_number: 5, category: "save" },
  { id: "stable.w6.s1", week_number: 6, category: "review" },
  { id: "stable.w7.s1", week_number: 7, category: "save" },
  { id: "stable.w8.s1", week_number: 8, category: "save" },
  { id: "stable.w9.s1", week_number: 9, category: "review" },
  { id: "stable.w10.s1", week_number: 10, category: "review" },
  { id: "stable.w11.s1", week_number: 11, category: "save" },
  { id: "stable.w12.s1", week_number: 12, category: "review" },
];

const COMFORTABLE_DEFS: StepDef[] = [
  { id: "comfortable.w5.s1", week_number: 5, category: "review" },
  { id: "comfortable.w6.s1", week_number: 6, category: "review" },
  { id: "comfortable.w7.s1", week_number: 7, category: "save" },
  { id: "comfortable.w8.s1", week_number: 8, category: "review" },
  { id: "comfortable.w9.s1", week_number: 9, category: "save" },
  { id: "comfortable.w10.s1", week_number: 10, category: "save" },
  { id: "comfortable.w11.s1", week_number: 11, category: "income_boost" },
  { id: "comfortable.w12.s1", week_number: 12, category: "review" },
];

const DEFS_BY_SITUATION: Record<Situation, StepDef[]> = {
  struggling: STRUGGLING_DEFS,
  tight: TIGHT_DEFS,
  stable: STABLE_DEFS,
  comfortable: COMFORTABLE_DEFS,
};

export function getStarterPlan(
  situation: Situation,
  t: StarterTranslator,
): StarterPlan {
  const defs = [...COMMON_DEFS, ...DEFS_BY_SITUATION[situation]];
  // Step IDs contain dots (e.g. "common.w1.s1"), which next-intl would
  // interpret as a nested path. Use the raw dictionary so the literal
  // key is preserved and we look it up ourselves.
  const stepsTable = t.raw("steps") as Record<
    string,
    { focus: string; title: string; description: string }
  >;
  return {
    title: t(`titles.${situation}`),
    summary: t(`summaries.${situation}`),
    steps: defs.map((d) => {
      const s = stepsTable[d.id];
      return {
        week_number: d.week_number,
        focus: s.focus,
        title: s.title,
        description: s.description,
        category: d.category,
      };
    }),
  };
}
